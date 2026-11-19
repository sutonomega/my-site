import type { Work } from '../src/types';

export function publicTrackId(work: Work): string;
export function findTrack(works: Work[], id: string): Work | undefined;
export function trackPagePath(work: Work): string;
export function lyricsPath(slug: string): string;
export function audioFilename(slug: string): string;
export function audioUrl(slug: string): string;
export function savedAudioKey(value: string, base: string): string | undefined;
