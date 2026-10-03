import {test,expect} from '@playwright/test';
import 'dotenv/config';
import {PrismaClient} from '../../generated/prisma/client';
import {PrismaPg} from '@prisma/adapter-pg';
const db=new PrismaClient({adapter:new PrismaPg({connectionString:process.env.DATABASE_URL})});
const email=`auth-${Date.now()}@example.com`;
test.afterAll(async()=>{const user=await db.user.findUnique({where:{email}});if(user){await db.shop.deleteMany({where:{ownerId:user.id}});await db.user.delete({where:{id:user.id}});}await db.$disconnect();});
test('register, create sales book, sign out and retry login',async({page})=>{
 await page.goto('/dashboard');await expect(page).toHaveURL(/login$/);await page.goto('/register');await page.getByLabel('Your name').fill('Test Owner');await page.getByLabel('Email address').fill(email);await page.getByLabel('Password',{exact:true}).fill('Strong test password 2026');await page.getByLabel('Confirm password').fill('Strong test password 2026');await page.getByRole('button',{name:'Create account'}).click();await expect(page).toHaveURL(/dashboard$/);
 await page.getByRole('link',{name:'Create sales book'}).click();await page.getByLabel('Business name').fill('Test Shop');await page.getByRole('button',{name:'Create sales book'}).click();await expect(page.getByRole('heading',{name:'Your business at a glance.'})).toBeVisible();
 const workspaceUrl=page.url();await page.goto(`${workspaceUrl}?tab=items`);const sessionBefore=(await page.context().cookies()).find(c=>c.name==='bookme-session')?.value;expect(sessionBefore).toBeTruthy();await page.locator('a.brand').click();await expect(page).toHaveURL(workspaceUrl);await expect(page.getByRole('heading',{name:'Your business at a glance.'})).toBeVisible();expect((await page.context().cookies()).find(c=>c.name==='bookme-session')?.value).toBe(sessionBefore);
 await page.getByRole('link',{name:'Sales books',exact:true}).click();await expect(page.getByRole('link',{name:'Add another business'})).toBeVisible();await page.getByRole('link',{name:'Open sales book →'}).click();
 await page.getByRole('button',{name:'Sign out'}).click();await expect(page).toHaveURL(/login$/);await page.getByLabel('Email address').fill(email);await page.getByLabel('Password',{exact:true}).fill('wrong password');await page.getByRole('button',{name:'Sign in'}).click();await expect(page.getByText('Email or password is incorrect.',{exact:true})).toBeVisible();await expect(page.getByLabel('Email address')).toHaveValue(email);
 await page.getByLabel('Password',{exact:true}).fill('Strong test password 2026');await page.getByRole('button',{name:'Sign in'}).click();await expect(page.getByRole('heading',{name:'Your business at a glance.'})).toBeVisible();
});
test('landing fits desktop and mobile',async({page})=>{for(const width of [390,1440]){await page.setViewportSize({width,height:900});await page.goto('/');expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:`/private/tmp/salesbook-landing-${width}.png`,fullPage:true});}});
