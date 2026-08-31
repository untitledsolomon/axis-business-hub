"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCreateInvitation } from "@/hooks/organisation/use-team";
import { toast } from "sonner";
import posthog from "posthog-js";
import { Copy, Check } from "lucide-react";

const INVITABLE_ROLES = [
  { value: "admin", label: "Admin" },
  { value: "accountant", label: "Accountant" },
  { value: "hr_manager", label: "HR Manager" },
  { value: "inventory_manager", label: "Inventory Manager" },
  { value: "sales", label: "Sales" },
  { value: "staff", label: "Staff" },
  { value: "read_only", label: "Read Only" },
];

const formSchema = z.object({
  email: z.string().email("Enter a valid email address"),
  role: z.string().min(1, "Select a role"),
});

interface InviteMemberFormProps {
  orgId: string;
  onSuccess?: () => void;
}

export function InviteMemberForm({ orgId, onSuccess }: InviteMemberFormProps) {
  const createInvitation = useCreateInvitation(orgId);
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { email: "", role: "staff" },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      const result = await createInvitation.mutateAsync(values);
      posthog.capture("team_member_invited", { role: values.role });
      setGeneratedCode(result.code);
    } catch (error: unknown) {
      const rawMessage = error instanceof Error ? error.message : "Failed to create invite";
      const message = rawMessage.includes("Plan limit reached for users")
        ? "You've reached your plan's user limit. Upgrade your plan to invite more team members."
        : rawMessage;
      toast.error(message);
    }
  }

  async function handleCopy() {
    if (!generatedCode) return;
    await navigator.clipboard.writeText(generatedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (generatedCode) {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border border-border bg-muted/40 p-4 text-center">
          <p className="text-xs text-muted-foreground">Share this invite code</p>
          <p className="numeric mt-1 text-2xl font-bold tracking-widest text-foreground">{generatedCode}</p>
          <p className="mt-2 text-xs text-muted-foreground">
            Valid for 7 days. The invitee enters this code after signing in to join your organisation.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={handleCopy}>
            {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
            {copied ? "Copied" : "Copy Code"}
          </Button>
          <Button
            className="flex-1 bg-axis-blue hover:bg-axis-blue-light"
            onClick={() => {
              setGeneratedCode(null);
              form.reset();
              onSuccess?.();
            }}
          >
            Done
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input type="email" placeholder="colleague@example.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="role"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Role</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {INVITABLE_ROLES.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button
          type="submit"
          className="w-full bg-axis-blue hover:bg-axis-blue-light"
          disabled={createInvitation.isPending}
        >
          {createInvitation.isPending ? "Generating…" : "Generate Invite Code"}
        </Button>
      </form>
    </Form>
  );
}
