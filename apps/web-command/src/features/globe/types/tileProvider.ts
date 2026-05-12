import { z } from 'zod';

export const tileProviderSchema = z.enum(['google', 'cesium-ion']);
export type TileProvider = z.infer<typeof tileProviderSchema>;
