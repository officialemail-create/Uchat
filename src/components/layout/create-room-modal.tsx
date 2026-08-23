import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useCreateRoom, getGetRoomsQueryKey, type Room } from "@workspace/api-client-react";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";

const createRoomSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(80),
  description: z.string().max(300).optional(),
  privacy: z.enum(["public", "private"]),
});

type FormValues = z.infer<typeof createRoomSchema>;

export default function CreateRoomModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const createRoom = useCreateRoom();

  const form = useForm<FormValues>({
    resolver: zodResolver(createRoomSchema),
    defaultValues: {
      name: "",
      description: "",
      privacy: "public",
    },
  });

  const onSubmit = (data: FormValues) => {
    if (createRoom.isPending) return;

    createRoom.mutate(
      { data },
      {
        onSuccess: (room: Room) => {
          queryClient.invalidateQueries({ queryKey: getGetRoomsQueryKey() });
          onClose();
          form.reset();
          setLocation(`/rooms/${room.id}`);
        },
      }
    );
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      onClose();
      if (!createRoom.isPending) {
        form.reset({ name: "", description: "", privacy: "public" });
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="border-0 bg-transparent p-0 shadow-none sm:max-w-lg">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="overflow-hidden rounded-2xl border border-gray-200 bg-white p-6 text-left shadow-xl dark:border-gray-700 dark:bg-gray-900"
        >
          <DialogHeader className="mb-6">
            <DialogTitle className="text-xl font-semibold tracking-tight text-gray-900 dark:text-white">Create a room</DialogTitle>
            
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5" aria-busy={createRoom.isPending}>
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="mb-1.5 block text-sm font-medium leading-6 text-gray-900 dark:text-gray-200">Room name</FormLabel>
                    <FormControl>
                      <input
                        {...field}
                        disabled={createRoom.isPending}
                        className="block w-full rounded-lg border-0 py-2.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-purple-600 sm:text-sm sm:leading-6 dark:bg-gray-800 dark:text-white dark:ring-gray-700"
                        placeholder="Name"
                        data-testid="input-room-name"
                      />
                    </FormControl>
                    <FormMessage className="mt-2 text-sm text-red-600 dark:text-red-400" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="mb-1.5 block text-sm font-medium leading-6 text-gray-900 dark:text-gray-200">
                      Description <span className="text-xs font-normal text-gray-400">(optional)</span>
                    </FormLabel>
                    <FormControl>
                      <textarea
                        {...field}
                        disabled={createRoom.isPending}
                        className="block h-24 w-full resize-none rounded-lg border-0 py-2.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-purple-600 sm:text-sm sm:leading-6 dark:bg-gray-800 dark:text-white dark:ring-gray-700"
                        placeholder="What is this room about?"
                        data-testid="input-room-desc"
                      />
                    </FormControl>
                    <FormMessage className="mt-2 text-sm text-red-600 dark:text-red-400" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="privacy"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="mb-1.5 block text-sm font-medium leading-6 text-gray-900 dark:text-gray-200">Privacy</FormLabel>
                    <FormControl>
                      <div className="grid grid-cols-2 gap-2 rounded-xl border border-gray-200 p-1 dark:border-gray-700">
                        <label
                          className={`flex cursor-pointer items-center justify-center rounded-lg px-3 py-2 text-sm font-medium transition ${field.value === "public"
                            ? "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300"
                            : "bg-white text-gray-600 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"}`}
                        >
                          <input type="radio" value="public" checked={field.value === "public"} onChange={field.onChange} className="sr-only" />
                          <span>Public</span>
                        </label>
                        <label
                          className={`flex cursor-pointer items-center justify-center rounded-lg px-3 py-2 text-sm font-medium transition ${field.value === "private"
                            ? "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300"
                            : "bg-white text-gray-600 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"}`}
                        >
                          <input type="radio" value="private" checked={field.value === "private"} onChange={field.onChange} className="sr-only" />
                          <span>Private</span>
                        </label>
                      </div>
                    </FormControl>
                    <FormMessage className="mt-2 text-sm text-red-600 dark:text-red-400" />
                  </FormItem>
                )}
              />

              <DialogFooter className="mt-2 flex-col-reverse gap-3 sm:flex-row">
                <button
                  type="button"
                  aria-label="Cancel creating room"
                  onClick={() => handleOpenChange(false)}
                  disabled={createRoom.isPending}
                  className="inline-flex w-full justify-center rounded-lg bg-white px-3 py-2.5 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 transition hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-purple-600 focus:ring-offset-2 dark:bg-gray-800 dark:text-gray-300 dark:ring-gray-700 dark:hover:bg-gray-700 dark:focus:ring-offset-gray-950 sm:w-auto"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  aria-label="Create room"
                  disabled={createRoom.isPending}
                  className="inline-flex w-full justify-center rounded-lg bg-purple-600 px-3 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-purple-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-600 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                  data-testid="button-create-room"
                >
                  {createRoom.isPending ? "Creating..." : "Create Room"}
                </button>
              </DialogFooter>
            </form>
          </Form>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}
