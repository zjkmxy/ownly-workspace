import { createAvatar } from '@dicebear/core';
import { funEmoji } from '@dicebear/collection';

const AVATAR_CACHE: Record<string, string> = {};

/**
 * Generates a random avatar based on a seed
 * @param seed The seed to generate the avatar from
 * @returns The generated avatar
 */
export function makeAvatar(seed: string): string {
    if (AVATAR_CACHE[seed]) {
        return AVATAR_CACHE[seed];
    }

    const res = createAvatar(funEmoji, { seed });

    const { svg } = res.toJson();
    const blob = new Blob([svg], { type: 'image/svg+xml' });
    AVATAR_CACHE[seed] = URL.createObjectURL(blob);
    return AVATAR_CACHE[seed];
}