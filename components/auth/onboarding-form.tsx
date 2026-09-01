"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useOrg } from "@/hooks/use-org";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CardContent, CardFooter } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import posthog from "posthog-js";
import { useAcceptInvitation } from "@/hooks/organisation/use-team";
import { ArrowRight, Building2, Check, KeyRound, Sparkles } from "lucide-react";
import { OnboardingFlow } from "./onboarding-flow";

const onboardingSchema = z.object({
  name: z.string().min(2, "Organisation name must be at least 2 characters"),
  slug: z.string().min(2, "Slug must be at least 2 characters").regex(/^[a-z0-9-]+$/, "Slug can only contain lowercase letters, numbers, and hyphens"),
});

type OnboardingValues = z.infer<typeof onboardingSchema>;

const inviteSchema = z.object({
  code: z.string().min(4, "Enter the invite code you were given"),
});

type InviteValues = z.infer<typeof inviteSchema>;

function JoinWithInviteForm() {
  const router = useRouter();
  const { refreshOrgs } = useOrg();
  const acceptInvitation = useAcceptInvitation();

  const form = useForm<InviteValues>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { code: "" },
  });

  const onSubmit = async (values: InviteValues) => {
    acceptInvitation.mutate(
      { code: values.code.trim().toUpperCase() },
      {
        onSuccess: async () => {
          posthog.capture("organisation_invitation_accepted");
          await refreshOrgs();
          router.push("/");
        },
      }
    );
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <CardContent className="space-y-4 pt-6">
          <FormField
            control={form.control}
            name="code"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Invite Code</FormLabel>
                <FormControl>
                  <Input
                    placeholder="e.g. 7F3KQD2A"
                    autoCapitalize="characters"
                    className="uppercase tracking-widest"
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  Ask whoever invited you for the code from their Team settings page.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </CardContent>
        <CardFooter>
          <Button className="w-full" type="submit" disabled={acceptInvitation.isPending}>
            {acceptInvitation.isPending ? "Joining..." : "Join Organisation"}
          </Button>
        </CardFooter>
      </form>
    </Form>
  );
}

export function OnboardingForm() {
  const [isLoading, setIsLoading] = useState(false);
  const { user, isLoading: isAuthLoading } = useAuth();
  const { refreshOrgs } = useOrg();
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  const { currentOrg } = useOrg();
  const isCreatingNewOrg = searchParams.get("new") === "true";

  const form = useForm<OnboardingValues>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      name: "",
      slug: "",
    },
  });

  if (currentOrg && !isCreatingNewOrg) {
    return <OnboardingFlow />;
  }

  const onSubmit = async (values: OnboardingValues) => {
    if (isAuthLoading) return;
    if (!user) {
      toast.error("Your session has expired. Please sign in again.");
      router.push("/login");
      return;
    }

    setIsLoading(true);

    const { error } = await supabase.rpc('create_new_organisation', {
      org_name: values.name,
      org_slug: values.slug,
      user_id: user.id
    });

    if (error) {
      toast.error(error.message);
    } else {
      posthog.capture("organisation_created");
      toast.success("Organisation created successfully!");
      await refreshOrgs();
      router.push("/onboarding");
    }
    setIsLoading(false);
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newName = e.target.value;
    form.setValue("name", newName);
    form.setValue("slug", newName.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, ''), { shouldValidate: true });
  };

  return (
    <main className="min-h-screen overflow-hidden bg-primary-soft text-foreground">
      <div className="mx-auto grid min-h-screen max-w-7xl gap-10 px-6 py-6 lg:grid-cols-[0.85fr_1.15fr] lg:px-12 lg:py-10">
        <section className="flex flex-col justify-between py-4 lg:py-8">
          <div>
            <div className="flex items-center gap-3 text-sm font-semibold tracking-[0.18em] uppercase">
              <span className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground">A</span>
              AXIS
            </div>
            <div className="mt-16 max-w-lg lg:mt-24">
              <p className="flex items-center gap-2 text-sm font-semibold text-teal"><Sparkles className="size-4" /> Your workspace, taking shape</p>
              <h1 className="mt-5 text-5xl font-semibold leading-[0.98] tracking-[-0.04em] sm:text-6xl">Build the way your business works.</h1>
              <p className="mt-6 max-w-md text-base leading-7 text-muted-foreground">Set up your workspace once, then bring your clients, invoices, people, and numbers into one calm place.</p>
            </div>
          </div>
          <div className="mt-12 hidden max-w-sm space-y-4 lg:block">
            {["One home for daily operations", "A clear view of what needs attention", "Ready for your team when you are"].map((item) => (
              <div key={item} className="flex items-center gap-3 text-sm font-medium text-muted-foreground"><span className="grid size-6 place-items-center rounded-full bg-background"><Check className="size-3.5 text-teal" /></span>{item}</div>
            ))}
          </div>
        </section>

        <section className="relative flex items-center justify-center">
          <div className="absolute -right-20 top-8 hidden h-44 w-44 rotate-12 rounded-[2.5rem] border-8 border-teal/40 bg-teal-soft lg:block" />
          <div className="absolute -bottom-12 -left-12 hidden h-36 w-36 -rotate-12 rounded-[2rem] bg-teal/30 lg:block" />
          <div className="relative w-full max-w-xl rounded-[2rem] border border-border bg-card p-5 shadow-pop sm:p-8">
            <div className="flex items-center justify-between border-b border-border pb-5">
              <div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal">Step 1 of 2</p><h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em]">Set up your workspace</h2></div>
              <div className="flex gap-1.5"><span className="size-2.5 rounded-full bg-teal" /><span className="size-2.5 rounded-full bg-muted" /></div>
            </div>
            <Tabs defaultValue="create" className="mt-7 w-full">
              <TabsList className="grid h-auto grid-cols-2 gap-2 bg-muted p-1.5">
                <TabsTrigger value="create" className="gap-2 py-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"><Building2 className="size-4" /> Create new</TabsTrigger>
                <TabsTrigger value="join" className="gap-2 py-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"><KeyRound className="size-4" /> Join invite</TabsTrigger>
              </TabsList>
              <TabsContent value="create" className="mt-7">
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                    <div><h3 className="text-lg font-semibold">What should we call it?</h3><p className="mt-1 text-sm text-muted-foreground">This is the shared home for your business.</p></div>
                    <FormField control={form.control} name="name" render={({ field }) => <FormItem><FormLabel>Organisation name</FormLabel><FormControl><Input placeholder="Acme Studio" {...field} onChange={(e) => { field.onChange(e); handleNameChange(e); }} className="h-12 rounded-xl border-border bg-background px-4" /></FormControl><FormMessage /></FormItem>} />
                    <FormField control={form.control} name="slug" render={({ field }) => <FormItem><FormLabel>Workspace address</FormLabel><FormControl><div className="flex items-center rounded-xl border border-border bg-background px-4"><span className="text-sm text-muted-foreground">axis /</span><Input placeholder="acme-studio" {...field} className="h-11 border-0 bg-transparent px-2 shadow-none focus-visible:ring-0" /></div></FormControl><FormDescription>Use lowercase letters, numbers, and hyphens.</FormDescription><FormMessage /></FormItem>} />
                    <Button className="h-12 w-full font-semibold" type="submit" disabled={isLoading || isAuthLoading}>{isAuthLoading ? "Loading session..." : isLoading ? "Creating workspace..." : <>Continue to billing <ArrowRight className="size-4" /></>}</Button>
                  </form>
                </Form>
              </TabsContent>
              <TabsContent value="join" className="mt-7"><JoinWithInviteForm /></TabsContent>
            </Tabs>
            <p className="mt-7 text-center text-xs text-muted-foreground">You can invite your team after setup.</p>
          </div>
        </section>
      </div>
    </main>
  );
}
