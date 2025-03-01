import { createAvatar, type Style } from '@dicebear/core';
import { funEmoji, shapes } from '@dicebear/collection';

const AVATAR_CACHE: Record<string, string> = {};

/**
 * Generates a random avatar based on a seed
 * @param seed The seed to generate the avatar from
 * @param style The style of the avatar
 * @returns The generated avatar
 */
export function makeAvatar(seed: string, style: 'emoji' | 'shapes' = 'emoji'): string {
  if (AVATAR_CACHE[seed]) {
    return AVATAR_CACHE[seed];
  }

  let collection: Style<any>;
  switch (style) {
    case 'emoji':
      collection = funEmoji;
      break;
    case 'shapes':
      collection = shapes;
      break;
    default:
      throw new Error('Invalid style');
  }

  const res = createAvatar(collection, { seed });

  const { svg } = res.toJson();
  const blob = new Blob([svg], { type: 'image/svg+xml' });
  AVATAR_CACHE[seed] = URL.createObjectURL(blob);
  return AVATAR_CACHE[seed];
}
