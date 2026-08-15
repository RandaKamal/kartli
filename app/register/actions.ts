"use server";

import { randomBytes } from "node:crypto";
import { redirect } from "next/navigation";
import { pool } from "@/lib/db";
import { hashPassword } from "@/lib/password";

export async function registerKitchen(formData: FormData) {
  // read and clean input data
  const kitchenName = String(formData.get("kitchenName") || "").trim();     //remove extra spaces
  const adminName = String(formData.get("adminName") || "").trim();
  const adminPassword = String(formData.get("adminPassword") || "");
  const memberNames = String(formData.get("members") || "")
    .split("\n")
    .map((s) => s.trim())
    //remove extra lines
    .filter(Boolean);

  // check that everything is filled in correctly
  if (!kitchenName || !adminName || !adminPassword) {
    throw new Error("Kitchen, name, and password are required.");
  }

  // insert the new registered kitchen into the table
 const { rows: [kitchen], } = await pool.query<{ id: number }>( 
  `INSERT INTO kitchens (name) 
  VALUES ($1) 
  RETURNING id`, 
  [kitchenName] );

  // insert the admin details into the members table and set is_admin=true
  await pool.query(
    `INSERT INTO members (kitchen_id, name, is_admin, password_hash) 
    VALUES ($1, $2, true, $3)`,
    [kitchen.id, adminName, hashPassword(adminPassword)]
  );

  // insert the members list with invite token value
  for (const memberName of memberNames) {
    const inviteToken = randomBytes(16).toString("hex");
    await pool.query(
      `INSERT INTO members (kitchen_id, name, is_admin, invite_token) 
      VALUES ($1, $2, false, $3)`,
      [kitchen.id, memberName, inviteToken]
    );
  }

  redirect("/login");
}
