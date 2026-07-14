"use client";

import { useEffect, useMemo, useState, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { BackButton } from "@/components/BackButton";
import type { Player, PlayerGroup } from "@/lib/types";

interface PlayersPayload {
  players: Player[];
}

interface GroupsPayload {
  groups: PlayerGroup[];
  members?: Record<string, Player[]>;
}

type Step = "groups" | "setup";
type SlotKey = "A0" | "A1" | "B0" | "B1";

const SLOT_ORDER: SlotKey[] = ["A0", "A1", "B0", "B1"];

const AVATAR_PALETTE: Array<[string, string]> = [
  ["#e7cd8e", "#10261c"],
  ["#8fbfa4", "#0a1f17"],
  ["#a9b6e0", "#0f1428"],
  ["#e0a9b6", "#28101a"],
  ["#c9d9a0", "#152210"],
  ["#9fd0d0", "#0a2222"],
];

function avatarFor(id: string): { bg: string; fg: string } {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  const [bg, fg] = AVATAR_PALETTE[Math.abs(h) % AVATAR_PALETTE.length];
  return { bg, fg };
}

function initialOf(username: string): string {
  return username.slice(0, 1).toUpperCase();
}

function memberCountLabel(count: number): string {
  return `${count} ${count === 1 ? "igrač" : "igrača"}`;
}

export default function NewGamePage() {
  const router = useRouter();
  const [players, setPlayers] = useState<Player[]>([]);
  const [groups, setGroups] = useState<PlayerGroup[]>([]);
  const [groupPlayers, setGroupPlayers] = useState<Player[]>([]);
  const [groupMembers, setGroupMembers] = useState<Record<string, Player[]>>({});
  const [step, setStep] = useState<Step>("groups");
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [activeSlot, setActiveSlot] = useState<SlotKey | null>("A0");

  const [groupQuery, setGroupQuery] = useState("");
  const [addingGroup, setAddingGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [renaming, setRenaming] = useState(false);
  const [renameName, setRenameName] = useState("");
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [addInput, setAddInput] = useState("");
  const [addFocused, setAddFocused] = useState(false);

  const [loading, setLoading] = useState(false);
  const [creatingPlayer, setCreatingPlayer] = useState(false);
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [deletingGroup, setDeletingGroup] = useState(false);
  const [addingToGroup, setAddingToGroup] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    groupId: "",
    dealerPlayerId: "",
    teamA: ["", ""] as [string, string],
    teamB: ["", ""] as [string, string],
  });

  const selectedGroup = useMemo(
    () => groups.find((group) => group.id === selectedGroupId) ?? null,
    [groups, selectedGroupId],
  );

  const slots = useMemo<Record<SlotKey, string>>(
    () => ({ A0: form.teamA[0], A1: form.teamA[1], B0: form.teamB[0], B1: form.teamB[1] }),
    [form],
  );
  const assignedIds = useMemo(
    () => new Set(SLOT_ORDER.map((key) => slots[key]).filter(Boolean)),
    [slots],
  );
  const poolPlayers = useMemo(
    () => groupPlayers.filter((player) => !assignedIds.has(player.id)),
    [groupPlayers, assignedIds],
  );
  const allSlotsFilled = SLOT_ORDER.every((key) => !!slots[key]);
  const dealerChipsPlayers = useMemo(
    () =>
      allSlotsFilled
        ? SLOT_ORDER.map((key) => groupPlayers.find((player) => player.id === slots[key])).filter(
            (player): player is Player => !!player,
          )
        : [],
    [allSlotsFilled, groupPlayers, slots],
  );
  const teamsReady = allSlotsFilled && !!form.dealerPlayerId;
  let setupCounterLabel: string;
  let setupCounterColor: string;
  if (!allSlotsFilled) {
    setupCounterLabel = "Rasporedi sva 4 mjesta u timovima";
    setupCounterColor = "#d0a97a";
  } else if (!form.dealerPlayerId) {
    setupCounterLabel = "Odaberi prvog djelitelja";
    setupCounterColor = "#d0a97a";
  } else {
    setupCounterLabel = "✓ Spremno za partiju";
    setupCounterColor = "#a9c98f";
  }

  const visibleGroups = useMemo(() => {
    const query = groupQuery.trim().toLowerCase();
    if (!query) return groups;
    return groups.filter((group) => group.name.toLowerCase().includes(query));
  }, [groups, groupQuery]);

  const manyGroups = groups.length >= 6;
  const showSearch = manyGroups;
  const noGroupResults = groupQuery.trim().length > 0 && visibleGroups.length === 0;

  const suggestions = useMemo(() => {
    if (!selectedGroup || !addFocused) return [] as Array<
      | { kind: "existing"; player: Player }
      | { kind: "create"; name: string }
    >;
    const query = addInput.trim().toLowerCase();
    const inGroup = new Set(groupPlayers.map((player) => player.id));
    const matches = players
      .filter(
        (player) =>
          !inGroup.has(player.id) &&
          (query === "" || player.username.toLowerCase().includes(query)),
      )
      .slice(0, 6);
    const list: Array<
      | { kind: "existing"; player: Player }
      | { kind: "create"; name: string }
    > = matches.map((player) => ({ kind: "existing", player }));
    const exact = players.some((player) => player.username.toLowerCase() === query);
    if (query !== "" && !exact) {
      list.unshift({ kind: "create", name: addInput.trim() });
    }
    return list;
  }, [selectedGroup, addFocused, addInput, players, groupPlayers]);

  const showSuggest = !!selectedGroup && addFocused && suggestions.length > 0;

  const total = groupPlayers.length;
  const canContinue = !!selectedGroup && total >= 4;
  let counterLabel: string;
  let counterColor: string;
  if (!selectedGroup) {
    counterLabel = "Odaberi grupu za nastavak";
    counterColor = "#7d9587";
  } else if (canContinue) {
    counterLabel = `✓ ${total} igrača — spremno za postavu`;
    counterColor = "#a9c98f";
  } else {
    counterLabel = `Treba ${4 - total} igrača više (min. 4)`;
    counterColor = "#d0a97a";
  }

  async function loadPlayers() {
    const response = await fetch(`/api/players?t=${Date.now()}`, { cache: "no-store" });
    const data = (await response.json()) as PlayersPayload;
    setPlayers(data.players ?? []);
  }

  async function loadGroups(): Promise<PlayerGroup[]> {
    const response = await fetch(`/api/groups?t=${Date.now()}`, { cache: "no-store" });
    const data = (await response.json()) as GroupsPayload;
    const nextGroups = data.groups ?? [];
    setGroups(nextGroups);
    setGroupMembers((prev) => ({ ...prev, ...(data.members ?? {}) }));
    return nextGroups;
  }

  async function fetchGroupMembers(groupId: string): Promise<Player[]> {
    const response = await fetch(`/api/groups/${groupId}/players?t=${Date.now()}`, {
      cache: "no-store",
    });
    const data = (await response.json()) as PlayersPayload;
    return data.players ?? [];
  }

  async function loadGroupPlayers(groupId: string) {
    if (!groupId) {
      setGroupPlayers([]);
      return;
    }
    const nextPlayers = await fetchGroupMembers(groupId);
    setGroupPlayers(nextPlayers);
    setGroupMembers((prev) => ({ ...prev, [groupId]: nextPlayers }));
    setForm((prev) => ({
      ...prev,
      groupId,
      dealerPlayerId: nextPlayers.find((player) => player.id === prev.dealerPlayerId)?.id ?? "",
      teamA: [
        nextPlayers.find((player) => player.id === prev.teamA[0])?.id ?? "",
        nextPlayers.find((player) => player.id === prev.teamA[1])?.id ?? "",
      ],
      teamB: [
        nextPlayers.find((player) => player.id === prev.teamB[0])?.id ?? "",
        nextPlayers.find((player) => player.id === prev.teamB[1])?.id ?? "",
      ],
    }));
  }

  useEffect(() => {
    void Promise.all([loadPlayers(), loadGroups()]);
  }, []);

  useEffect(() => {
    if (!selectedGroupId) {
      setGroupPlayers([]);
      return;
    }
    void loadGroupPlayers(selectedGroupId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedGroupId]);

  useEffect(() => {
    if (step === "setup") {
      setActiveSlot(SLOT_ORDER.find((key) => !slots[key]) ?? null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  function clickSlot(key: SlotKey) {
    const current = slots[key];
    if (current) {
      setForm((prev) => ({
        ...prev,
        teamA: key === "A0" ? ["", prev.teamA[1]] : key === "A1" ? [prev.teamA[0], ""] : prev.teamA,
        teamB: key === "B0" ? ["", prev.teamB[1]] : key === "B1" ? [prev.teamB[0], ""] : prev.teamB,
        dealerPlayerId: prev.dealerPlayerId === current ? "" : prev.dealerPlayerId,
      }));
    }
    setActiveSlot(key);
  }

  function clickPoolPlayer(playerId: string) {
    if (!activeSlot) return;
    const key = activeSlot;
    const next = { ...slots, [key]: playerId };
    setForm((prev) => ({
      ...prev,
      teamA: [next.A0, next.A1],
      teamB: [next.B0, next.B1],
    }));
    setActiveSlot(SLOT_ORDER.find((slotKey) => !next[slotKey]) ?? null);
  }

  function clickDealer(playerId: string) {
    setForm((prev) => ({
      ...prev,
      dealerPlayerId: prev.dealerPlayerId === playerId ? "" : playerId,
    }));
  }

  function selectGroup(id: string) {
    setSelectedGroupId(id);
    setRenaming(false);
    setConfirmingDelete(false);
    setAddInput("");
    setAddFocused(false);
    setError("");
  }

  async function confirmAddGroup() {
    const name = newGroupName.trim();
    if (!name) {
      setAddingGroup(false);
      setNewGroupName("");
      return;
    }
    setCreatingGroup(true);
    setError("");
    const response = await fetch("/api/groups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    setCreatingGroup(false);
    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      setError(body.error ?? "Greška pri kreiranju grupe");
      return;
    }
    const body = (await response.json()) as { group: PlayerGroup };
    setAddingGroup(false);
    setNewGroupName("");
    await loadGroups();
    setGroupMembers((prev) => ({ ...prev, [body.group.id]: prev[body.group.id] ?? [] }));
    selectGroup(body.group.id);
  }

  async function confirmRename() {
    const name = renameName.trim();
    setRenaming(false);
    if (!selectedGroupId || !name || name === selectedGroup?.name) return;
    setError("");
    const response = await fetch(`/api/groups/${selectedGroupId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      setError(body.error ?? "Greška pri preimenovanju grupe");
      return;
    }
    await loadGroups();
  }

  async function confirmDelete() {
    if (!selectedGroupId) return;
    setDeletingGroup(true);
    setError("");
    const deletedId = selectedGroupId;
    const response = await fetch(`/api/groups/${deletedId}`, { method: "DELETE" });
    setDeletingGroup(false);
    setConfirmingDelete(false);
    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      setError(body.error ?? "Greška pri brisanju grupe");
      return;
    }
    setGroupMembers((prev) => {
      const next = { ...prev };
      delete next[deletedId];
      return next;
    });
    const nextGroups = await loadGroups();
    selectGroup(nextGroups[0]?.id ?? "");
  }

  async function addPlayerToSelectedGroup(playerId: string) {
    if (!selectedGroupId || !playerId) return;
    setAddingToGroup(true);
    setError("");
    const response = await fetch(`/api/groups/${selectedGroupId}/players`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playerId }),
    });
    setAddingToGroup(false);
    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      setError(body.error ?? "Greška pri dodavanju igrača u grupu");
      return;
    }
    setAddInput("");
    setAddFocused(true);
    await loadGroupPlayers(selectedGroupId);
  }

  async function removePlayerFromSelectedGroup(playerId: string) {
    if (!selectedGroupId || !playerId) return;
    setError("");
    const response = await fetch(`/api/groups/${selectedGroupId}/players`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playerId }),
    });
    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      setError(body.error ?? "Greška pri brisanju igrača iz grupe");
      return;
    }
    await loadGroupPlayers(selectedGroupId);
  }

  async function createAndAddPlayer(rawName: string) {
    const username = rawName.trim();
    if (!selectedGroupId || !username) return;
    setCreatingPlayer(true);
    setError("");
    const response = await fetch("/api/players", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username }),
    });
    setCreatingPlayer(false);
    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      setError(body.error ?? "Greška pri dodavanju igrača");
      return;
    }
    const body = (await response.json()) as { player: Player };
    await addPlayerToSelectedGroup(body.player.id);
    await loadPlayers();
  }

  function onAddEnter() {
    const query = addInput.trim().toLowerCase();
    if (!query) return;
    const inGroup = new Set(groupPlayers.map((player) => player.id));
    const match =
      players.find((player) => !inGroup.has(player.id) && player.username.toLowerCase() === query) ??
      players.find((player) => !inGroup.has(player.id) && player.username.toLowerCase().includes(query));
    if (match) void addPlayerToSelectedGroup(match.id);
    else void createAndAddPlayer(addInput.trim());
  }

  async function createGame() {
    if (!selectedGroupId) {
      setError("Odaberi grupu prije kreiranja partije.");
      return;
    }
    if (!teamsReady) return;
    setLoading(true);
    setError("");
    const response = await fetch("/api/games", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, groupId: selectedGroupId }),
    });
    setLoading(false);

    if (!response.ok) {
      const body = (await response.json()) as { error?: string };
      setError(body.error ?? "Greška pri kreiranju partije");
      return;
    }

    const body = (await response.json()) as { game: { id: string } };
    router.push(`/game/${body.game.id}`);
  }

  function renderGroupCard(group: PlayerGroup) {
    const isSelected = group.id === selectedGroupId;
    const members = groupMembers[group.id] ?? [];
    const shown = members.slice(0, 4);
    const overflow = members.length - shown.length;
    return (
      <div
        key={group.id}
        role="button"
        tabIndex={0}
        onClick={() => selectGroup(group.id)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            selectGroup(group.id);
          }
        }}
        className="relative flex cursor-pointer flex-col rounded-2xl border-[1.5px] p-3 pr-[13px] transition-colors"
        style={{
          background: isSelected ? "rgba(201,217,160,.10)" : "rgba(15,50,36,.5)",
          borderColor: isSelected ? "#c9d9a0" : "rgba(255,255,255,.06)",
        }}
      >
        <div
          className="absolute right-[10px] top-[10px] flex h-[18px] w-[18px] items-center justify-center rounded-full transition-opacity"
          style={{
            background: "linear-gradient(180deg, #d7f1c7, #c9d9a0)",
            opacity: isSelected ? 1 : 0,
          }}
        >
          <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
            <path
              d="M2.5 6.2L5 8.5L9.5 3.5"
              stroke="#10261c"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <div className="mb-[10px] flex shrink-0">
          {shown.map((member, index) => {
            const { bg, fg } = avatarFor(member.id);
            return (
              <div
                key={member.id}
                className="flex h-[26px] w-[26px] items-center justify-center rounded-full text-[10.5px] font-extrabold"
                style={{
                  marginLeft: index === 0 ? 0 : "-8px",
                  background: bg,
                  color: fg,
                  border: "1.5px solid #0b241b",
                }}
              >
                {initialOf(member.username)}
              </div>
            );
          })}
          {overflow > 0 ? (
            <div
              className="flex h-[26px] w-[26px] items-center justify-center rounded-full text-[10.5px] font-extrabold"
              style={{
                marginLeft: shown.length === 0 ? 0 : "-8px",
                background: "rgba(6,20,16,.85)",
                color: "#b7ccbf",
                border: "1.5px solid #0b241b",
              }}
            >
              +{overflow}
            </div>
          ) : null}
          {members.length === 0 ? (
            <div
              className="flex h-[26px] w-[26px] items-center justify-center rounded-full text-[13px] font-extrabold"
              style={{
                background: "rgba(6,20,16,.6)",
                color: "#6f857a",
                border: "1.5px dashed rgba(169,194,179,.3)",
              }}
            >
              ·
            </div>
          ) : null}
        </div>
        <div className="w-full min-w-0">
          <p className="m-0 truncate text-sm font-bold text-[#f2f5f0]">{group.name}</p>
          <p
            className="mt-[2px] text-[11.5px] font-semibold"
            style={{ color: isSelected ? "#c9d9a0" : "#8fa89b" }}
          >
            {memberCountLabel(members.length)}
          </p>
        </div>
      </div>
    );
  }

  function renderTeamSlot(key: SlotKey) {
    const playerId = slots[key];
    const player = groupPlayers.find((candidate) => candidate.id === playerId) ?? null;
    const isActive = activeSlot === key;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        clickSlot(key);
      }
    };
    if (player) {
      const { bg, fg } = avatarFor(player.id);
      return (
        <div
          key={key}
          role="button"
          tabIndex={0}
          onClick={() => clickSlot(key)}
          onKeyDown={handleKeyDown}
          className="flex min-h-[46px] cursor-pointer items-center gap-2 rounded-xl px-[10px] py-2 transition-colors"
          style={{
            border: isActive ? "1.5px solid #c9d9a0" : "1.5px solid rgba(169,194,179,.16)",
            background: isActive ? "rgba(201,217,160,.08)" : "rgba(6,20,16,.4)",
          }}
        >
          <div
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10.5px] font-extrabold"
            style={{ background: bg, color: fg }}
          >
            {initialOf(player.username)}
          </div>
          <span className="min-w-0 flex-1 truncate text-[12.5px] font-bold text-[#f2f5f0]">
            {player.username}
          </span>
          <span className="shrink-0 text-[10px] text-[#7d9587]">✕</span>
        </div>
      );
    }
    return (
      <div
        key={key}
        role="button"
        tabIndex={0}
        onClick={() => clickSlot(key)}
        onKeyDown={handleKeyDown}
        className="flex min-h-[46px] cursor-pointer items-center gap-2 rounded-xl px-[10px] py-2 transition-colors"
        style={{
          border: isActive ? "1.5px solid #c9d9a0" : "1.5px dashed rgba(201,217,160,.32)",
          background: isActive ? "rgba(201,217,160,.08)" : "rgba(201,217,160,.04)",
        }}
      >
        <div
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[13px] leading-none"
          style={{ border: "1.5px dashed rgba(201,217,160,.4)", color: "#c9d9a0" }}
        >
          +
        </div>
        <span
          className="flex-1 text-xs font-semibold"
          style={{ color: isActive ? "#c9d9a0" : "#6f857a" }}
        >
          {isActive ? "Odaberi igrača" : "Prazno mjesto"}
        </span>
      </div>
    );
  }

  function renderDealerChip(player: Player) {
    const { bg, fg } = avatarFor(player.id);
    const selected = form.dealerPlayerId === player.id;
    return (
      <div
        key={player.id}
        role="button"
        tabIndex={0}
        onClick={() => clickDealer(player.id)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            clickDealer(player.id);
          }
        }}
        className="relative cursor-pointer rounded-xl px-1 py-[9px] text-center transition-colors"
        style={{
          border: selected ? "1.5px solid #c9d9a0" : "1.5px solid rgba(169,194,179,.16)",
          background: selected ? "rgba(201,217,160,.14)" : "rgba(6,20,16,.4)",
        }}
      >
        <div
          className="mx-auto mb-[5px] flex h-[22px] w-[22px] items-center justify-center rounded-full text-[10px] font-extrabold"
          style={{ background: bg, color: fg }}
        >
          {initialOf(player.username)}
        </div>
        <p className="m-0 truncate text-[11px] font-bold text-[#f2f5f0]">{player.username}</p>
        {selected ? (
          <div
            className="absolute right-1 top-1 flex h-[13px] w-[13px] items-center justify-center rounded-full"
            style={{ background: "linear-gradient(180deg, #d7f1c7, #c9d9a0)" }}
          >
            <svg width="7" height="7" viewBox="0 0 12 12" fill="none">
              <path
                d="M2.5 6.2L5 8.5L9.5 3.5"
                stroke="#10261c"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <main className="mx-auto w-full max-w-3xl p-4 pb-20">
      <BackButton fallbackHref="/" className="mb-3" />
      <section className="card p-4">
        {step === "groups" ? (
          <>
            {/* header */}
            <div>
              <div className="flex items-center gap-2">
                <span className="flex h-[22px] w-[22px] items-center justify-center rounded-full bg-[rgba(201,217,160,.16)] text-xs font-extrabold text-[#c9d9a0]">
                  1
                </span>
                <p className="m-0 text-[11px] font-bold uppercase tracking-[0.06em] text-[#8fa89b]">
                  Korak 1 od 2 · Grupa
                </p>
              </div>
              <h1 className="mt-2 text-xl font-extrabold text-[#f7fbf6]">Odabir grupe igrača</h1>
              <p className="mt-1 text-sm text-[#97a49c]">
                Odaberi grupu tapom ili napravi novu. Dodaj igrače u jednom polju.
              </p>
            </div>

            {/* search */}
            {showSearch ? (
              <div
                className="mt-4 flex items-center gap-2 rounded-xl py-[3px] pl-3 pr-[3px]"
                style={{
                  background: "rgba(6,20,16,.5)",
                  border: "1px solid rgba(169,194,179,.16)",
                }}
              >
                <svg width="15" height="15" viewBox="0 0 16 16" fill="none" className="shrink-0">
                  <circle cx="7" cy="7" r="5" stroke="#8fa89b" strokeWidth="1.3" />
                  <path d="M11 11L14 14" stroke="#8fa89b" strokeWidth="1.3" strokeLinecap="round" />
                </svg>
                <input
                  value={groupQuery}
                  onChange={(event) => setGroupQuery(event.target.value)}
                  placeholder="Traži grupu…"
                  className="min-w-0 flex-1 border-none bg-transparent py-[9px] text-[13px] font-medium text-[#eef3ee] outline-none"
                />
                {groupQuery.trim().length > 0 ? (
                  <button
                    type="button"
                    onClick={() => setGroupQuery("")}
                    title="Očisti"
                    className="mr-1 flex h-[26px] w-[26px] items-center justify-center rounded-full border-none bg-[rgba(255,255,255,.05)] p-0 text-[15px] leading-none text-[#8fa89b]"
                  >
                    ×
                  </button>
                ) : null}
              </div>
            ) : null}

            {/* group grid */}
            <div
              className={`mt-4 grid grid-cols-2 gap-[10px]${
                manyGroups ? " no-scrollbar overflow-y-auto pr-[2px]" : ""
              }`}
              style={manyGroups ? { maxHeight: 300 } : undefined}
            >
              {visibleGroups.map((group) => renderGroupCard(group))}

              {noGroupResults ? (
                <div className="col-span-2 px-2 py-[14px] text-center text-[12.5px] text-[#7d9587]">
                  Nema grupe za „{groupQuery.trim()}”.
                </div>
              ) : null}

              {/* new group tile / inline input */}
              {addingGroup ? (
                <div
                  className="col-span-2 flex min-h-[96px] flex-col justify-center gap-2 rounded-2xl p-[11px]"
                  style={{
                    background: "rgba(6,20,16,.5)",
                    border: "1.5px solid rgba(201,217,160,.5)",
                  }}
                >
                  <input
                    autoFocus
                    value={newGroupName}
                    onChange={(event) => setNewGroupName(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") void confirmAddGroup();
                      if (event.key === "Escape") {
                        setAddingGroup(false);
                        setNewGroupName("");
                      }
                    }}
                    placeholder="Naziv grupe"
                    className="w-full rounded-[10px] px-[10px] py-2 text-[13px] font-semibold text-[#eef3ee] outline-none"
                    style={{
                      background: "rgba(6,20,16,.55)",
                      border: "1px solid rgba(169,194,179,.24)",
                    }}
                  />
                  <div className="flex gap-[6px]">
                    <button
                      type="button"
                      onClick={() => {
                        setAddingGroup(false);
                        setNewGroupName("");
                      }}
                      className="shrink-0 rounded-[9px] bg-transparent px-[10px] py-[7px] text-xs font-bold text-[#b7ccbf]"
                      style={{ border: "1px solid rgba(169,194,179,.28)" }}
                    >
                      Odustani
                    </button>
                    <button
                      type="button"
                      onClick={() => void confirmAddGroup()}
                      disabled={creatingGroup}
                      className="flex-1 rounded-[9px] border-none px-[10px] py-[7px] text-xs font-extrabold text-[#10261c] disabled:opacity-60"
                      style={{ background: "linear-gradient(180deg, #d7f1c7, #c9d9a0)" }}
                    >
                      {creatingGroup ? "Spremam…" : "Kreiraj"}
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    setAddingGroup(true);
                    setNewGroupName("");
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      setAddingGroup(true);
                      setNewGroupName("");
                    }
                  }}
                  className="flex min-h-[96px] cursor-pointer flex-col items-center justify-center gap-[7px] rounded-2xl p-[13px] transition-colors"
                  style={{
                    background: "rgba(201,217,160,.04)",
                    border: "1.5px dashed rgba(201,217,160,.32)",
                  }}
                >
                  <div className="flex h-[30px] w-[30px] items-center justify-center rounded-full bg-[rgba(201,217,160,.14)] text-[20px] font-medium leading-none text-[#c9d9a0]">
                    +
                  </div>
                  <p className="m-0 text-[12.5px] font-bold text-[#c9d9a0]">Nova grupa</p>
                </div>
              )}
            </div>

            {/* selected group detail */}
            {selectedGroup ? (
              <div
                className="mt-4 flex flex-col gap-3 rounded-[18px] p-[14px]"
                style={{
                  background: "rgba(15,50,36,.5)",
                  border: "1px solid rgba(255,255,255,.06)",
                }}
              >
                {/* header + menu */}
                <div className="flex items-center justify-between gap-2">
                  {renaming ? (
                    <input
                      autoFocus
                      value={renameName}
                      onChange={(event) => setRenameName(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") void confirmRename();
                        if (event.key === "Escape") setRenaming(false);
                      }}
                      onBlur={() => void confirmRename()}
                      className="flex-1 rounded-[9px] px-[9px] py-[6px] text-sm font-bold text-[#eef3ee] outline-none"
                      style={{
                        background: "rgba(6,20,16,.55)",
                        border: "1px solid rgba(201,217,160,.5)",
                      }}
                    />
                  ) : (
                    <p className="m-0 text-[14.5px] font-extrabold text-[#f7fbf6]">
                      {selectedGroup.name}
                    </p>
                  )}
                  <div className="flex shrink-0 gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        setRenaming(true);
                        setRenameName(selectedGroup.name);
                        setConfirmingDelete(false);
                      }}
                      title="Preimenuj"
                      className="flex h-[30px] w-[30px] items-center justify-center rounded-[9px] p-0"
                      style={{
                        background: "rgba(6,20,16,.35)",
                        border: "1px solid rgba(169,194,179,.2)",
                      }}
                    >
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                        <path
                          d="M11 2.5L13.5 5L5.5 13H3V10.5L11 2.5Z"
                          stroke="#b7ccbf"
                          strokeWidth="1.3"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setConfirmingDelete(true);
                        setRenaming(false);
                      }}
                      title="Obriši grupu"
                      className="flex h-[30px] w-[30px] items-center justify-center rounded-[9px] p-0"
                      style={{
                        background: confirmingDelete ? "rgba(190,70,70,.18)" : "rgba(6,20,16,.35)",
                        border: confirmingDelete
                          ? "1px solid rgba(220,110,110,.5)"
                          : "1px solid rgba(169,194,179,.2)",
                      }}
                    >
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                        <path
                          d="M3 4.5H13M6.5 4.5V3.2C6.5 2.8 6.8 2.5 7.2 2.5H8.8C9.2 2.5 9.5 2.8 9.5 3.2V4.5M5 4.5V13C5 13.4 5.3 13.7 5.7 13.7H10.3C10.7 13.7 11 13.4 11 13V4.5"
                          stroke={confirmingDelete ? "#e79a9a" : "#b7ccbf"}
                          strokeWidth="1.3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </button>
                  </div>
                </div>

                {confirmingDelete ? (
                  <div
                    className="flex items-center gap-[10px] rounded-xl px-[11px] py-[10px]"
                    style={{
                      background: "rgba(190,70,70,.12)",
                      border: "1px solid rgba(220,110,110,.34)",
                    }}
                  >
                    <p className="m-0 flex-1 text-xs font-semibold leading-[1.35] text-[#f0c9c9]">
                      Obrisati grupu i sve članove iz nje?
                    </p>
                    <button
                      type="button"
                      onClick={() => setConfirmingDelete(false)}
                      className="rounded-lg bg-transparent px-[9px] py-[6px] text-[11.5px] font-bold text-[#b7ccbf]"
                      style={{ border: "1px solid rgba(169,194,179,.28)" }}
                    >
                      Ne
                    </button>
                    <button
                      type="button"
                      onClick={() => void confirmDelete()}
                      disabled={deletingGroup}
                      className="rounded-lg border-none px-[11px] py-[6px] text-[11.5px] font-extrabold text-[#2a0c0c] disabled:opacity-60"
                      style={{ background: "linear-gradient(180deg, #f0a3a3, #e07a7a)" }}
                    >
                      {deletingGroup ? "Brišem…" : "Obriši"}
                    </button>
                  </div>
                ) : null}

                {/* members */}
                <div className="flex flex-wrap gap-[7px]">
                  {groupPlayers.map((member) => {
                    const { bg, fg } = avatarFor(member.id);
                    return (
                      <div
                        key={member.id}
                        className="flex items-center gap-[7px] rounded-full py-[5px] pl-[5px] pr-[6px]"
                        style={{
                          background: "rgba(6,20,16,.5)",
                          border: "1px solid rgba(169,194,179,.16)",
                        }}
                      >
                        <div
                          className="flex h-[22px] w-[22px] items-center justify-center rounded-full text-[10px] font-extrabold"
                          style={{ background: bg, color: fg }}
                        >
                          {initialOf(member.username)}
                        </div>
                        <span className="text-[12.5px] font-semibold text-[#e6efe8]">
                          {member.username}
                        </span>
                        <button
                          type="button"
                          onClick={() => void removePlayerFromSelectedGroup(member.id)}
                          title="Ukloni"
                          className="flex h-[18px] w-[18px] items-center justify-center rounded-full border-none bg-[rgba(255,255,255,.05)] p-0 text-[13px] leading-none text-[#8fa89b]"
                        >
                          ×
                        </button>
                      </div>
                    );
                  })}
                  {groupPlayers.length === 0 ? (
                    <span className="py-1 text-xs text-[#7d9587]">
                      Još nema igrača u ovoj grupi.
                    </span>
                  ) : null}
                </div>

                {/* smart add player */}
                <div className="relative">
                  <div
                    className="flex items-center gap-2 rounded-xl py-[3px] pl-3 pr-[3px]"
                    style={{
                      background: "rgba(6,20,16,.5)",
                      border: addFocused
                        ? "1px solid rgba(201,217,160,.45)"
                        : "1px solid rgba(169,194,179,.16)",
                    }}
                  >
                    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" className="shrink-0">
                      <circle cx="7" cy="7" r="5" stroke="#8fa89b" strokeWidth="1.3" />
                      <path d="M11 11L14 14" stroke="#8fa89b" strokeWidth="1.3" strokeLinecap="round" />
                    </svg>
                    <input
                      value={addInput}
                      onChange={(event) => {
                        setAddInput(event.target.value);
                        setAddFocused(true);
                      }}
                      onFocus={() => setAddFocused(true)}
                      onBlur={() => window.setTimeout(() => setAddFocused(false), 120)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") onAddEnter();
                        if (event.key === "Escape") setAddFocused(false);
                      }}
                      placeholder="Dodaj igrača — traži ili upiši novog"
                      autoCapitalize="none"
                      autoCorrect="off"
                      className="min-w-0 flex-1 border-none bg-transparent py-[9px] text-[13px] font-medium text-[#eef3ee] outline-none"
                    />
                    {creatingPlayer || addingToGroup ? (
                      <span className="mr-2 text-[11px] font-semibold text-[#8fa89b]">…</span>
                    ) : null}
                  </div>
                  {showSuggest ? (
                    <div
                      onMouseDown={(event) => event.preventDefault()}
                      className="absolute left-0 right-0 z-10 mt-[6px] max-h-[220px] overflow-y-auto rounded-xl p-[5px]"
                      style={{
                        top: "100%",
                        background: "#0c241b",
                        border: "1px solid rgba(169,194,179,.2)",
                        boxShadow: "0 20px 40px -14px rgba(0,0,0,.7)",
                      }}
                    >
                      {suggestions.map((suggestion) => {
                        if (suggestion.kind === "create") {
                          return (
                            <div
                              key="__create"
                              onClick={() => void createAndAddPlayer(suggestion.name)}
                              className="flex cursor-pointer items-center gap-[9px] rounded-[9px] px-[9px] py-2"
                              style={{ background: "rgba(201,217,160,.06)" }}
                            >
                              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[rgba(201,217,160,.16)] text-[11px] font-extrabold text-[#c9d9a0]">
                                +
                              </div>
                              <span className="flex-1 text-[13px] font-semibold text-[#e6efe8]">
                                &quot;{suggestion.name}&quot;
                              </span>
                              <span className="text-[10px] font-bold uppercase tracking-[0.04em] text-[#c9d9a0]">
                                Kreiraj novog
                              </span>
                            </div>
                          );
                        }
                        const { bg, fg } = avatarFor(suggestion.player.id);
                        return (
                          <div
                            key={suggestion.player.id}
                            onClick={() => void addPlayerToSelectedGroup(suggestion.player.id)}
                            className="flex cursor-pointer items-center gap-[9px] rounded-[9px] px-[9px] py-2"
                          >
                            <div
                              className="flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-extrabold"
                              style={{ background: bg, color: fg }}
                            >
                              {initialOf(suggestion.player.username)}
                            </div>
                            <span className="flex-1 text-[13px] font-semibold text-[#e6efe8]">
                              {suggestion.player.username}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}

            {/* counter + CTA */}
            <div className="mt-4 flex flex-col gap-2">
              <div
                className="flex items-center justify-center gap-[6px] text-xs font-semibold"
                style={{ color: counterColor }}
              >
                <span>{counterLabel}</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (canContinue) setStep("setup");
                }}
                disabled={!canContinue}
                className="btn-accent w-full rounded-2xl p-[15px] text-[15px] font-extrabold disabled:opacity-60"
              >
                {canContinue ? "Nastavi na postavu partije" : "Odaberi 4+ igrača"}
              </button>
            </div>
          </>
        ) : (
          <>
            <div>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="flex h-[22px] w-[22px] items-center justify-center rounded-full bg-[rgba(201,217,160,.16)] text-xs font-extrabold text-[#c9d9a0]">
                    2
                  </span>
                  <p className="m-0 text-[11px] font-bold uppercase tracking-[0.06em] text-[#8fa89b]">
                    Korak 2 od 2 · Postava
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setStep("groups")}
                  className="rounded-full border-none bg-transparent px-[2px] py-1 text-xs font-bold text-[#8fa89b]"
                >
                  ‹ Grupe
                </button>
              </div>
              <h1 className="mt-2 text-xl font-extrabold text-[#f7fbf6]">Timovi i prvi djelitelj</h1>
              <p className="mt-1 text-xs text-[#8fa89b]">
                Grupa: <span className="font-bold text-[#c9d9a0]">{selectedGroup?.name ?? "-"}</span>
              </p>
            </div>

            {/* team slots + pool */}
            <div
              className="mt-4 flex flex-col gap-[10px] rounded-[18px] p-[14px]"
              style={{ background: "rgba(15,50,36,.5)", border: "1px solid rgba(255,255,255,.06)" }}
            >
              <div className="grid grid-cols-2 gap-[10px]">
                <div className="flex flex-col gap-[7px]">
                  <p className="m-0 text-center text-[10px] font-bold uppercase tracking-[0.06em] text-[#7d9587]">
                    Tim A
                  </p>
                  {renderTeamSlot("A0")}
                  {renderTeamSlot("A1")}
                </div>
                <div className="flex flex-col gap-[7px]">
                  <p className="m-0 text-center text-[10px] font-bold uppercase tracking-[0.06em] text-[#7d9587]">
                    Tim B
                  </p>
                  {renderTeamSlot("B0")}
                  {renderTeamSlot("B1")}
                </div>
              </div>

              <div className="mt-[2px] pt-[10px]" style={{ borderTop: "1px solid rgba(255,255,255,.06)" }}>
                <p className="m-0 mb-2 text-[10.5px] font-bold uppercase tracking-[0.06em] text-[#7d9587]">
                  Igrači u grupi
                </p>
                <div className="flex flex-wrap gap-[7px]">
                  {poolPlayers.map((player) => {
                    const { bg, fg } = avatarFor(player.id);
                    return (
                      <div
                        key={player.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => clickPoolPlayer(player.id)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            clickPoolPlayer(player.id);
                          }
                        }}
                        className="flex cursor-pointer items-center gap-[7px] rounded-full py-[5px] pl-[5px] pr-[10px] transition-colors"
                        style={{ background: "rgba(6,20,16,.5)", border: "1px solid rgba(169,194,179,.16)" }}
                      >
                        <div
                          className="flex h-[22px] w-[22px] items-center justify-center rounded-full text-[10px] font-extrabold"
                          style={{ background: bg, color: fg }}
                        >
                          {initialOf(player.username)}
                        </div>
                        <span className="text-[12.5px] font-semibold text-[#e6efe8]">
                          {player.username}
                        </span>
                      </div>
                    );
                  })}
                  {poolPlayers.length === 0 ? (
                    <span className="py-1 text-xs text-[#7d9587]">Svi igrači su raspoređeni.</span>
                  ) : null}
                </div>
              </div>
            </div>

            {/* dealer */}
            <div
              className="mt-3 flex flex-col gap-[9px] rounded-[18px] p-[14px]"
              style={{ background: "rgba(15,50,36,.5)", border: "1px solid rgba(255,255,255,.06)" }}
            >
              <p className="m-0 text-[10.5px] font-bold uppercase tracking-[0.06em] text-[#7d9587]">
                Prvi djelitelj
              </p>
              {allSlotsFilled ? (
                <div className="grid grid-cols-4 gap-[6px]">
                  {dealerChipsPlayers.map((player) => renderDealerChip(player))}
                </div>
              ) : (
                <p className="m-0 text-xs leading-[1.5] text-[#6f857a]">
                  Dovrši postavu oba tima da odabereš prvog djelitelja.
                </p>
              )}
            </div>

            {/* counter + footer */}
            <div className="mt-4 flex flex-col gap-2">
              <div
                className="flex items-center justify-center gap-[6px] text-xs font-semibold"
                style={{ color: setupCounterColor }}
              >
                <span>{setupCounterLabel}</span>
              </div>
              <div className="grid grid-cols-[1fr_1.6fr] gap-2">
                <button
                  type="button"
                  onClick={() => setStep("groups")}
                  className="rounded-2xl p-[15px] text-[13px] font-bold text-[#dcece3]"
                  style={{ border: "1px solid rgba(169,194,179,.3)", background: "transparent" }}
                >
                  Nazad
                </button>
                <button
                  type="button"
                  onClick={createGame}
                  disabled={!teamsReady || loading}
                  className="rounded-2xl p-[15px] text-[15px] font-extrabold transition-colors"
                  style={
                    teamsReady
                      ? {
                          background: "linear-gradient(180deg, #d7f1c7, #c9d9a0)",
                          color: "#10261c",
                          boxShadow: "0 14px 28px -10px rgba(201,217,160,.5)",
                        }
                      : { background: "rgba(255,255,255,.04)", color: "#5f7268" }
                  }
                >
                  {loading
                    ? "Kreiram…"
                    : teamsReady
                      ? "Pokreni partiju"
                      : !allSlotsFilled
                        ? "Rasporedi igrače"
                        : "Odaberi djelitelja"}
                </button>
              </div>
            </div>
          </>
        )}

        {error ? <p className="mt-3 text-sm text-rose-300">{error}</p> : null}
      </section>
    </main>
  );
}
