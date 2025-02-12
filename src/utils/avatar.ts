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
    AVATAR_CACHE[seed] = res.toDataUri();
    return AVATAR_CACHE[seed];
}