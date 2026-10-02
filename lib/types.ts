export type Role = "customer" | "merchant" | "admin";


export interface Profile {

	id: string;

	username: string | null;

	full_name: string | null;

	bio: string | null;

	avatar_url: string | null;

	whatsapp: string | null;

	role: Role;

	store_name?: string | null;

	store_category?: string | null;

	store_bio?: string | null;

	assistant_enabled?: boolean | null;

	assistant_instructions?: string | null;

}


export const STORY_COLORS = [
		"#111111",
		"#0F766E",
		"#B45309",
		"#9D174D",
		"#1D4ED8",
		"#6D28D9",
	];

export const STORY_TEXT_COLORS = ["#FFFFFF", "#111111", "#FDE047", "#FB7185", "#67E8F9"];

export type StoryTextStyle = "classic" | "strong" | "label";

export type StoryAppearance = {
	background: string;
	textColor: string;
	textStyle: StoryTextStyle;
	textSize: number;
	x: number;
	y: number;
};

const STORY_APPEARANCE_PREFIX = "story-v1:";

export function encodeStoryAppearance(appearance: StoryAppearance): string {
	return `${STORY_APPEARANCE_PREFIX}${JSON.stringify(appearance)}`;
}

export function parseStoryAppearance(value: string | null | undefined): StoryAppearance {
	const fallback: StoryAppearance = {
		background: value || STORY_COLORS[0],
		textColor: "#FFFFFF",
		textStyle: "classic",
		textSize: 28,
		x: 50,
		y: 50,
	};
	if (!value?.startsWith(STORY_APPEARANCE_PREFIX)) return fallback;

	try {
		const saved = JSON.parse(value.slice(STORY_APPEARANCE_PREFIX.length)) as Partial<StoryAppearance>;
		const validColor = (color: unknown): color is string =>
			typeof color === "string" && /^#[\da-f]{6}$/i.test(color);
		return {
			background: validColor(saved.background) ? saved.background : fallback.background,
			textColor: validColor(saved.textColor) ? saved.textColor : fallback.textColor,
			textStyle: saved.textStyle === "strong" || saved.textStyle === "label" ? saved.textStyle : "classic",
			textSize: typeof saved.textSize === "number" ? Math.min(42, Math.max(18, saved.textSize)) : fallback.textSize,
			x: typeof saved.x === "number" ? Math.min(90, Math.max(10, saved.x)) : fallback.x,
			y: typeof saved.y === "number" ? Math.min(90, Math.max(10, saved.y)) : fallback.y,
		};
	} catch {
		return fallback;
	}
}
export type StoryMerchant = Pick<

Profile,

"id" | "full_name" | "username" | "avatar_url" | "whatsapp"

> & { store_name?: string | null };


export interface Story {

id: string;

merchant_id: string;

text: string;

bg_color: string;

image_url: string | null;

video_url: string | null;

media_type: "text" | "image" | "video";

product_id: string | null;

created_at: string;

expires_at: string;

}


export interface MerchantProduct {

id: string;

merchant_id: string;

title: string;

description: string | null;

hashtags: string[] | null;

price: number | null;

old_price: number | null;

category: string | null;

colors: string[] | null;

sizes: string[] | null;

cover_url: string | null;

promoted: boolean;

views: number;

created_at: string;
}
