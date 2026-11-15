"use client";

import type { ComponentProps } from "react";

import { cn } from "@/shared/lib/utils";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/shared/ui/sheet";

export {
  Sheet as BottomSheet,
  SheetClose as BottomSheetClose,
  SheetDescription as BottomSheetDescription,
  SheetFooter as BottomSheetFooter,
  SheetHeader as BottomSheetHeader,
  SheetTitle as BottomSheetTitle,
  SheetTrigger as BottomSheetTrigger,
};

export function BottomSheetContent({ className, ...props }: Omit<ComponentProps<typeof SheetContent>, "side">) {
  return (
    <SheetContent
      {...props}
      side="bottom"
      className={cn(
        "mx-auto max-h-[85dvh] w-full max-w-md overflow-y-auto overscroll-contain rounded-t-3xl pb-[env(safe-area-inset-bottom)] shadow-sheet",
        className,
      )}
    />
  );
}
