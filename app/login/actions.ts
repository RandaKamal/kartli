"use server";

import { redirect } from "next/navigation";
import { pool } from "@/lib/db";
import { verifyPassword } from "@/lib/password";

type Member = {
  id: number;
  is_admin: boolean;
  password_hash: string;
};

export async function loginToKitchen(formData: FormData) {
  // read and clean input data
  const kitchenName = String(formData.get("kitchenName") || "").trim();
  const memberName = String(formData.get("memberName") || "").trim();
  const password = String(formData.get("password") || "");

// check that everything is filled in correctly
  if (!kitchenName || !memberName || !password) {
    throw new Error("Kitchen name and password are required.");
  }

  // find kitchen
 const { rows: [kitchen], } = await pool.query<{ id: number }>( 
  `SELECT id 
  FROM kitchens 
  WHERE name = $1`, [kitchenName] );

  if (!kitchen) {
    throw new Error("No kitchen with that name.");
  }
 
// find member in that kitchen
const { rows: [member] } = await pool.query<Member>( 
  `SELECT id, is_admin, password_hash
     FROM members
     WHERE kitchen_id = $1 AND name = $2`,
    [kitchen.id, memberName]);

// check name and password
 if (!member || !member.password_hash || !verifyPassword(password, member.password_hash)) {
    throw new Error("Incorrect name or password.");
  }

  // if admin -> admin view else -> member view
  redirect(
    member.is_admin? 
    `/kitchen/${kitchen.id}/admin`
    : `/kitchen/${kitchen.id}/member`
  );
}
