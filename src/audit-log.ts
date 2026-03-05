import mongoose from 'mongoose';

const normalizeValue = (value: unknown): unknown => {
  if (value instanceof mongoose.Types.ObjectId) {
    return value.toString();
  }

  if (Array.isArray(value)) {
    return value.map((item) => normalizeValue(item));
  }

  if (value && typeof value === 'object') {
    const doc = value as { toObject?: () => unknown };

    if (typeof doc.toObject === 'function') {
      return normalizeValue(doc.toObject());
    }
  }

  return value;
};

const valuesAreEqual = (left: unknown, right: unknown): boolean => {
  return (
    JSON.stringify(normalizeValue(left)) ===
    JSON.stringify(normalizeValue(right))
  );
};

export const buildAuditChanges = ({
  beforeData,
  afterData,
  fieldsToCheck,
  protectedFields = [],
}: {
  beforeData: Record<string, unknown>;
  afterData: Record<string, unknown>;
  fieldsToCheck: string[];
  protectedFields?: string[];
}) => {
  const protectedSet = new Set(protectedFields);

  return fieldsToCheck
    .filter((field) => !protectedSet.has(field))
    .filter((field) => !valuesAreEqual(beforeData[field], afterData[field]))
    .map((field) => ({
      field,
      before: normalizeValue(beforeData[field]),
      after: normalizeValue(afterData[field]),
    }));
};

export const createAuditLog = async ({
  entityType,
  entityId,
  action,
  changedBy,
  changes,
  meta,
  save,
}: {
  entityType: string;
  entityId: mongoose.Types.ObjectId | string;
  action: string;
  changedBy?: mongoose.Types.ObjectId | string;
  changes: Array<{ field: string; before: unknown; after: unknown }>;
  meta?: Record<string, unknown>;
  save: (payload: {
    entityType: string;
    entityId: mongoose.Types.ObjectId | string;
    action: string;
    changedBy?: mongoose.Types.ObjectId | string;
    changes: Array<{ field: string; before: unknown; after: unknown }>;
    meta?: Record<string, unknown>;
  }) => Promise<unknown>;
}) => {
  if (!changes.length) {
    return null;
  }

  return save({
    entityType,
    entityId,
    action,
    changedBy,
    changes,
    meta,
  });
};
