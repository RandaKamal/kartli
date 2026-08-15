import Link from "next/link";

export default function Home() {
  return (
    <main>
      <h1>Kitchen</h1>
      <ul>
        <li>
          <Link href="/register">Register a new kitchen</Link>
        </li>
        <li>
          <Link href="/login">Log in to a kitchen</Link>
        </li>
      </ul>
    </main>
  );
}
