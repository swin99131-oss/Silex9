import { useEffect, useState } from "react";

import { supabase } from "./supabase";

import type { Profile } from "./types";


export function useProfile() {

const [user, setUser] = useState<any>(null);

const [profile, setProfile] = useState<Profile | null>(null);

const [loading, setLoading] = useState(true);




useEffect(() => {

async function loadData() {

const { data: { session } } = await supabase.auth.getSession();

const currentUser = session?.user ?? null;

setUser(currentUser);


if (currentUser) {

const { data } = await supabase

.from("profiles")

.select("*")

.eq("id", currentUser.id)

.single();

setProfile(data as Profile);

} else {

setProfile(null);

}

setLoading(false);

}


loadData();


const { data: sub } = supabase.auth.onAuthStateChange(async (_event, session) => {

const currentUser = session?.user ?? null;

setUser(currentUser);

if (currentUser) {

const { data } = await supabase

.from("profiles")

.select("*")

.eq("id", currentUser.id)

.single();

setProfile(data as Profile);

} else {

setProfile(null);

}

setLoading(false);

});


return () => {

sub.subscription.unsubscribe();

};

}, []);


return { user, profile, setProfile, loading };

}