"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { DIRECTIONS, FREQUENCIES, LEVELS, MEASURE_TYPES } from "@/lib/constants";
import { FormReader, formValues, type FormState } from "@/lib/forms";

/** Fields shared by project parameters and library definitions. */
function readDefinition(f: FormReader) {
  return {
    name: f.text("name", { required: true, max: 200 }),
    definition: f.text("definition", { max: 2000 }),
    level: f.oneOf("level", LEVELS, "output"),
    unit: f.text("unit", { max: 50 }),
    direction: f.oneOf("direction", DIRECTIONS, "increase"),
    measureType: f.oneOf("measureType", MEASURE_TYPES, "point"),
    frequency: f.oneOf("frequency", FREQUENCIES, "monthly"),
    dataSource: f.text("dataSource", { max: 200 }),
  };
}

async function readParameter(projectId: string, fd: FormData, selfId?: string) {
  const f = new FormReader(fd);
  const data = {
    ...readDefinition(f),
    baseline: f.number("baseline") ?? 0,
    target: f.number("target", { required: true }),
    targetDate: f.date("targetDate"),
    isKey: f.bool("isKey"),
    leadingIndicatorForId: f.text("leadingIndicatorForId") || null,
    libraryItemId: f.text("libraryItemId") || null,
  };
  if (data.target !== null) {
    if (data.direction === "increase" && data.target < data.baseline) {
      f.errors.target = "For an 'increase' metric the target should be at or above the baseline";
    }
    if (data.direction === "decrease" && data.target > data.baseline) {
      f.errors.target = "For a 'decrease' metric the target should be at or below the baseline";
    }
  }
  if (data.leadingIndicatorForId) {
    const linked = await db.parameter.findUnique({ where: { id: data.leadingIndicatorForId } });
    if (!linked || linked.projectId !== projectId || linked.id === selfId) {
      f.errors.leadingIndicatorForId = "Choose another parameter in this project";
    }
  }
  return { f, data };
}

function revalidateProject(projectId: string) {
  revalidatePath(`/projects/${projectId}`, "layout");
  revalidatePath("/");
}

export async function createParameter(projectId: string, _prev: FormState, fd: FormData): Promise<FormState> {
  const { f, data } = await readParameter(projectId, fd);
  if (!f.ok) return { errors: f.errors, values: formValues(fd) };
  const last = await db.parameter.findFirst({ where: { projectId }, orderBy: { sortOrder: "desc" } });
  await db.parameter.create({
    data: { ...data, target: data.target!, projectId, sortOrder: (last?.sortOrder ?? -1) + 1 },
  });
  revalidateProject(projectId);
  redirect(`/projects/${projectId}/parameters`);
}

export async function updateParameter(
  projectId: string,
  parameterId: string,
  _prev: FormState,
  fd: FormData,
): Promise<FormState> {
  const { f, data } = await readParameter(projectId, fd, parameterId);
  if (!f.ok) return { errors: f.errors, values: formValues(fd) };
  await db.parameter.update({ where: { id: parameterId, projectId }, data: { ...data, target: data.target! } });
  revalidateProject(projectId);
  redirect(`/projects/${projectId}/parameters`);
}

export async function setParameterArchived(projectId: string, parameterId: string, archived: boolean) {
  await db.parameter.update({
    where: { id: parameterId, projectId },
    data: { archivedAt: archived ? new Date() : null },
  });
  revalidateProject(projectId);
}

/** Copy a project parameter's definition into the library and link the two. */
export async function saveParameterToLibrary(projectId: string, parameterId: string) {
  const p = await db.parameter.findUniqueOrThrow({ where: { id: parameterId, projectId } });
  const item = await db.libraryParameter.create({
    data: {
      name: p.name,
      definition: p.definition,
      level: p.level,
      unit: p.unit,
      direction: p.direction,
      measureType: p.measureType,
      frequency: p.frequency,
      dataSource: p.dataSource,
    },
  });
  await db.parameter.update({ where: { id: p.id }, data: { libraryItemId: item.id } });
  revalidateProject(projectId);
  revalidatePath("/library");
}

// Library definitions

export async function createLibraryParameter(_prev: FormState, fd: FormData): Promise<FormState> {
  const f = new FormReader(fd);
  const data = readDefinition(f);
  if (!f.ok) return { errors: f.errors, values: formValues(fd) };
  await db.libraryParameter.create({ data });
  revalidatePath("/library");
  redirect("/library");
}

export async function updateLibraryParameter(id: string, _prev: FormState, fd: FormData): Promise<FormState> {
  const f = new FormReader(fd);
  const data = readDefinition(f);
  if (!f.ok) return { errors: f.errors, values: formValues(fd) };
  await db.libraryParameter.update({ where: { id }, data });
  revalidatePath("/library");
  redirect("/library");
}

/** Deleting a library item leaves project parameters untouched (they hold their own copy). */
export async function deleteLibraryParameter(id: string) {
  await db.libraryParameter.delete({ where: { id } });
  revalidatePath("/library");
}
