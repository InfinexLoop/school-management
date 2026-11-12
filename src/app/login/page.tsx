import Link from "next/link";
import { LockKeyhole, Sprout } from "lucide-react";
import { loginAction } from "@/app/actions";
import { currentUser } from "@/lib/auth";
import { redirect } from "next/navigation";

export const metadata = { title: "Portal Login" };
export default async function LoginPage({ searchParams }: { searchParams: Promise<{persona?:string;error?:string;next?:string}> }) {
  if (await currentUser()) redirect("/portal");
  const query = await searchParams;
  const message = query.error === "rate" ? "Too many recent attempts. Try again after ten minutes." : query.error ? "The username or password was not accepted." : null;
  return <main className="login-shell"><section className="login-art"><div className="brand"><span className="brand-mark"><Sprout size={20}/></span><span>Nanjil Grove Academy</span></div><h1>One school. One connected workspace.</h1><p>Secure individual access for school teams, students, guardians and alumni. Fictional demonstration data only.</p></section><section className="login-panel"><div className="login-box"><div className="icon-box"><LockKeyhole size={20}/></div><h2 style={{fontSize:"2.4rem",marginBlock:"1rem"}}>Welcome back</h2><p>Sign in with a username or email. Demo personas use the shared demonstration password.</p>{message&&<p className="notice">{message}</p>}<form action={loginAction}><input type="hidden" name="next" value={query.next??"/portal"}/><div className="field"><label htmlFor="identity">Username or email</label><input className="input" id="identity" name="identity" defaultValue={query.persona??""} autoComplete="username" required/></div><div className="field" style={{marginBlock:"1rem"}}><label htmlFor="password">Password</label><input className="input" id="password" name="password" type="password" defaultValue={query.persona?"GroveDemo@1126":""} autoComplete="current-password" required/><small>Forgotten demo credentials? Choose a persona on Demo Access.</small></div><button className="button" style={{width:"100%"}}>Sign in</button></form><p style={{marginTop:"1.5rem"}}><Link href="/demo-access"><strong>Choose a demo account →</strong></Link></p><p><Link href="/">← Return to school website</Link></p></div></section></main>;
}
