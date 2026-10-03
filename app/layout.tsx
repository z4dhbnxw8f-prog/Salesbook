import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title: {default:"Salesbook — Sales, stock and money",template:"%s | Salesbook"}, description:"Track sales, stock and worker handovers in your chosen currency." };
export default function Layout({children}:{children:React.ReactNode}) {return <html lang="en"><body><a className="skip" href="#main">Skip to content</a>{children}</body></html>;}
