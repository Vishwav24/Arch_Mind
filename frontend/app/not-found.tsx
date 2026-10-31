import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6">
      <div className="w-16 h-16 bg-[#7439D5]/10 text-[#7439D5] rounded-2xl flex items-center justify-center font-bold text-2xl mb-4">
        404
      </div>
      <h2 className="text-xl font-bold text-[#202044] mb-2">Page Not Found</h2>
      <p className="text-xs text-[#77758A] max-w-sm mb-6">
        The requested architectural resource or dashboard view could not be located.
      </p>
      <Link
        href="/"
        className="inline-flex items-center gap-2 px-4 py-2 bg-[#7439D5] text-white rounded-lg text-xs font-semibold hover:bg-[#602BB7] transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Return to Project</span>
      </Link>
    </div>
  );
}

