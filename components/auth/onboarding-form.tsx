"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useOrg } from "@/hooks/use-org";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import posthog from "posthog-js";
import { useAcceptInvitation } from "@/hooks/organisation/use-team";

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
  const supabase = createClient();

  const form = useForm<OnboardingValues>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      name: "",
      slug: "",
    },
  });

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
      router.push("/settings/billing");
    }
    setIsLoading(false);
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newName = e.target.value;
    form.setValue("name", newName);
    form.setValue("slug", newName.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, ''), { shouldValidate: true });
  };

  return (
    <div className="flex items-center justify-center p-8">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Welcome to AXIS</CardTitle>
          <CardDescription>
            Create a new organisation, or join one you&apos;ve been invited to.
          </CardDescription>
        </CardHeader>
        <Tabs defaultValue="create" className="w-full">
          <TabsList className="grid grid-cols-2 mx-6">
            <TabsTrigger value="create">Create Organisation</TabsTrigger>
            <TabsTrigger value="join">Join with Invite</TabsTrigger>
          </TabsList>
          <TabsContent value="create">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)}>
                <CardContent className="space-y-4 pt-6">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Organisation Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Acme Corp" {...field} onChange={(e) => {
                            field.onChange(e);
                            handleNameChange(e);
                          }} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="slug"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>URL Slug</FormLabel>
                        <FormControl>
                          <Input placeholder="acme-corp" {...field} />
                        </FormControl>
                        <FormDescription>
                          This will be used in your unique organisation URL.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
                <CardFooter>
                  <Button className="w-full" type="submit" disabled={isLoading || isAuthLoading}>
                    {isAuthLoading ? "Loading session..." : isLoading ? "Creating..." : "Create Organisation"}
                  </Button>
                </CardFooter>
              </form>
            </Form>
          </TabsContent>
          <TabsContent value="join">
            <JoinWithInviteForm />
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
}
