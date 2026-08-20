"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useOrg } from "@/hooks/use-org";
import { useOrganisation, useUpdateOrganisation } from "@/hooks/organisation/use-organisation";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/shared/PageHeader";
import { toast } from "sonner";

const formSchema = z.object({
  name: z.string().min(1, "Organisation name is required"),
  address: z.string().optional(),
  registration_number: z.string().optional(),
  tax_id: z.string().optional(),
  base_currency: z.string().min(1, "Currency is required"),
  country: z.string().min(1, "Country is required"),
});

export function OrganisationSettingsView() {
  const { currentOrg } = useOrg();
  const orgId = currentOrg?.id ?? "";
  const { data: org, isLoading } = useOrganisation(orgId);
  const updateOrg = useUpdateOrganisation();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      address: "",
      registration_number: "",
      tax_id: "",
      base_currency: "UGX",
      country: "Uganda",
    },
  });

  useEffect(() => {
    if (org) {
      form.reset({
        name: org.name,
        address: org.address ?? "",
        registration_number: org.registration_number ?? "",
        tax_id: org.tax_id ?? "",
        base_currency: org.base_currency,
        country: org.country,
      });
    }
  }, [org, form]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      await updateOrg.mutateAsync({ orgId, updates: values });
      toast.success("Organisation profile updated");
    } catch (error) {
      toast.error("Failed to update organisation profile");
      console.error(error);
    }
  }

  if (isLoading) {
    return (
      <>
        <PageHeader title="Organisation Settings" description="Manage your organisation profile." />
        <div className="">
          <div className="panel max-w-2xl p-6">
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-10 animate-pulse rounded-lg bg-muted" />
              ))}
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader title="Organisation Settings" description="Manage your organisation profile." />
      <div className="">
        <div className="panel max-w-2xl p-6">
          <div className="mb-6">
            <h2 className="font-display text-sm font-semibold text-foreground">Organisation Profile</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              This information appears on invoices, reports, and payslips.
            </p>
          </div>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Organisation Name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Street, city, country" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="registration_number"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Registration Number</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="tax_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tax ID</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="base_currency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Base Currency</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="UGX" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="country"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Country</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <Button type="submit" disabled={updateOrg.isPending}>
                {updateOrg.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </form>
          </Form>
        </div>
      </div>
    </>
  );
}
