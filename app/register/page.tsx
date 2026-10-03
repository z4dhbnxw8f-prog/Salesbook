import {AuthPage} from '@/components/auth-page';
export default async function Page({searchParams}:{searchParams:Promise<{next?:string}>}){const {next}=await searchParams;return <AuthPage mode="register" next={next&&/^\/join\/[a-f0-9]{64}$/.test(next)?next:undefined}/>;}
