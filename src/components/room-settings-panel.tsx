import { AnimatePresence, motion } from "framer-motion";
import { Crown, FileText, Globe2, Lock, LogOut, ShieldOff, Trash2, X } from "lucide-react";
import { RoomInvitePanel } from "@/components/room-invite-panel";
import type { RoomDetail } from "@/pages/rooms/room";

interface RoomSettingsPanelProps {
  open: boolean;
  onClose: () => void;
  room: RoomDetail | null;
  draftName: string;
  draftDescription: string;
  setDraftName: (value: string) => void;
  setDraftDescription: (value: string) => void;
  isSaving: boolean;
  inviteLink: string | null;
  roomCode?: string;
  onSaveDetails: () => void;
  onTogglePrivacy: () => void;
  onGenerateCode: () => void;
  onInvite: () => void;
  onLeave: () => void;
  onDelete: () => void;
  onRemoveMember: (memberId: string) => void;
  currentUserId?: string;
}

export default function RoomSettingsPanel({
  open,
  onClose,
  room,
  draftName,
  draftDescription,
  setDraftName,
  setDraftDescription,
  isSaving,
  inviteLink,
  roomCode,
  onSaveDetails,
  onTogglePrivacy,
  onGenerateCode,
  onInvite,
  onLeave,
  onDelete,
  onRemoveMember,
  currentUserId,
}: RoomSettingsPanelProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ x: "100%" }}
          animate={{ x: 0 }}
          exit={{ x: "100%" }}
          transition={{ type: "spring", stiffness: 240, damping: 28 }}
          className="fixed inset-0 z-[170] flex justify-end bg-black/45"
        >
          <div className="h-full w-full max-w-[430px] border-l border-white/10 bg-[#0B0F19] p-4 text-white shadow-2xl sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-[#C4B5FD]">Global chat settings</p>
                <h3 className="mt-2 text-xl font-semibold">Room controls</h3>
                <p className="mt-1 text-sm text-white/55"></p>
              </div>
              <button onClick={onClose} className="rounded-full border border-white/10 p-2 text-white/60 transition hover:bg-white/10" aria-label="Close room settings">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-5 space-y-4 overflow-y-auto pb-4">
              <div className="rounded-3xl border border-white/10 bg-[#111827] p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-white/85">
                  
                  Room details
                </div>

                <div className="mt-3 space-y-3">
                  <label className="block text-sm text-white/60">
                    <span className="mb-1 block">Room name</span>
                    <input
                      value={draftName}
                      onChange={(e) => setDraftName(e.target.value)}
                      className="w-full rounded-2xl border border-white/10 bg-[#0B0F19] px-3 py-2 text-sm outline-none"
                    />
                  </label>
                  <label className="block text-sm text-white/60">
                    <span className="mb-1 block">Description</span>
                    <input
                      value={draftDescription}
                      onChange={(e) => setDraftDescription(e.target.value)}
                      className="w-full rounded-2xl border border-white/10 bg-[#0B0F19] px-3 py-2 text-sm outline-none"
                    />
                  </label>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <button onClick={onSaveDetails} disabled={isSaving} className="rounded-full bg-[#8B5CF6] px-3 py-2 text-sm font-medium text-white disabled:opacity-50">
                    {isSaving ? "Saving…" : "Save details"}
                  </button>
                  <button onClick={onTogglePrivacy} className="rounded-full border border-white/10 px-3 py-2 text-sm text-white/70">
                    Make {room?.privacy === "public" ? "private" : "public"}
                  </button>
                </div>
              </div>

              <div className="rounded-3xl border border-white/10 bg-[#111827] p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-white/85">
                  {room?.privacy === "private" ? <Lock className="h-4 w-4 text-[#8B5CF6]" /> : <Globe2 className="h-4 w-4 text-[#8B5CF6]" />}
                  Invite & access
                </div>
                <div className="mt-3">
                  <RoomInvitePanel
                    roomName={room?.name}
                    inviteLink={inviteLink ?? ""}
                    roomCode={room?.privacy === "private" ? roomCode : ""}
                    onCopyLink={onInvite}
                    onRegenerateCode={onGenerateCode}
                  />
                </div>
              </div>

              <div className="rounded-3xl border border-white/10 bg-[#111827] p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-white/85">
                  
                  Members
                </div>
                <div className="mt-3 space-y-2">
                  {room?.members?.map((member) => (
                    <div key={member.id} className="flex items-center justify-between rounded-2xl bg-[#0B0F19] px-3 py-2 text-sm">
                      <div>
                        <p className="text-white/80">{member.displayName}</p>
                        <p className="text-xs text-white/45">@{member.username}</p>
                      </div>
                      {room.isOwner && member.id !== currentUserId ? (
                        <button onClick={() => onRemoveMember(member.id)} className="text-xs text-red-300">Remove</button>
                      ) : (
                        <span className="text-xs text-white/35">{member.id === currentUserId ? "You" : "Member"}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-3xl border border-red-500/20 bg-red-500/10 p-4">
                
                <div className="mt-3 flex flex-wrap gap-2">
                  <button onClick={onLeave} className="rounded-full border border-white/10 bg-[#0B0F19] px-3 py-2 text-sm text-white/75">Leave room</button>
                  {room?.isOwner && (
                    <button onClick={onDelete} className="rounded-full border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">Delete room</button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
