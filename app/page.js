import { NavbarWrapper } from "../components/NavbarWrapper";
import { Analytics } from "@vercel/analytics/next";

export default function Home() {
  return (
    <>
      <NavbarWrapper />
      <Analytics />
    </>
  );
}
