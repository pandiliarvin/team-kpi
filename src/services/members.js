import { supabase } from "./supabase";

export async function getCurrentMember(authUserId) {
  console.log("Searching for:", authUserId);

  const { data, error } = await supabase
    .from("members")
    .select("*")
    .eq("auth_user_id", authUserId);

  console.log("Supabase Data:", data);
  console.log("Supabase Error:", error);

  if (error) throw error;

  return data[0];
}