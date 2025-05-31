"use client"

import { useState } from "react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { createCredential, getCredentialTemplates } from "@/lib/data"
import { useQuery } from "@tanstack/react-query"
import { useRouter } from "next/navigation"

const formSchema = z.object({
  templateId: z.string().min(2, {
    message: "Template ID must be at least 2 characters.",
  }),
  holderDid: z.string().min(2, {
    message: "Holder DID must be at least 2 characters.",
  }),
})

interface IssueCredentialButtonProps {
  orgId: string
}

export function IssueCredentialButton({ orgId }: IssueCredentialButtonProps) {
  const [open, setOpen] = useState(false)
  const router = useRouter()
  const { toast } = useToast()
  const { data: credentialTemplates } = useQuery({
    queryKey: ["credentialTemplates"],
    queryFn: () => getCredentialTemplates(orgId),
  })

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      templateId: "",
      holderDid: "",
    },
  })

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      await createCredential({
        ...values,
        orgId,
      })
      toast({
        title: "Credential issued successfully!",
      })
      router.refresh()
      setOpen(false)
    } catch (error) {
      toast({
        title: "Something went wrong.",
        description: "There was an error issuing the credential.",
        variant: "destructive",
      })
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="outline">Issue Credential</Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Issue Credential</AlertDialogTitle>
          <AlertDialogDescription>Issue a new verifiable credential to a holder.</AlertDialogDescription>
        </AlertDialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="templateId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Template</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a template" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {credentialTemplates?.map((template) => (
                        <SelectItem key={template.id} value={template.id}>
                          {template.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="holderDid"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Holder DID</FormLabel>
                  <FormControl>
                    <Input placeholder="did:example:123" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction type="submit">Continue</AlertDialogAction>
            </AlertDialogFooter>
          </form>
        </Form>
      </AlertDialogContent>
    </AlertDialog>
  )
}
