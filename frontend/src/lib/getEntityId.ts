export function getEntityId(entity: any): string | undefined {
  if (!entity) return undefined;
  if (typeof entity === 'string') return entity;
  if (entity._id) return entity._id;
  if (entity.id) return entity.id;
  return undefined;
}
