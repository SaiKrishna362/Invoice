import { redirect } from "next/navigation";
import { auth } from "@/auth";

export default async function Home() {
  const session = await auth();

  // If logged in → go to dashboard
  // If not → go to login
  if (session) {
    redirect("/dashboard");
  } else {
    redirect("/login");
  }
}