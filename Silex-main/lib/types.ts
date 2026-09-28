export type Role = "customer" | "merchant";


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


export const STORY_COLORS = [

"#111111",

"#0F766E",

"#B45309",

"#9D174D",

"#1D4ED8",

"#6D28D9",

];