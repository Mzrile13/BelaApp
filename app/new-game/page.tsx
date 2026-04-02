"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { BackButton } from "@/components/BackButton";
import type { Player, PlayerGroup } from "@/lib/types";

interface PlayersPayload {
  players: Player[];
}

interface GroupsPayload {
  groups: PlayerGroup[];
}

type Step = "groups" | "setup";

export default function NewGamePage() {
  const router = useRouter();
  const [players, setPlayers] = useState<Player[]>([]);
  const [groups, setGroups] = useState<PlayerGroup[]>([]);
  const [groupPlayers, setGroupPlayers] = useState<Player[]>([]);
  const [step, setStep] = useState<Step>("groups");
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [groupName, setGroupName] = useState("");
  const [renameGroupName, setRenameGroupName] = useState("");
  const [existingPlayerId, setExistingPlayerId] = useState("");
  const [loading, setLoading] = useState(false);
  const [creatingPlayer, setCreatingPlayer] = useState(false);
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [renamingGroup, setRenamingGroup] = useState(false);
  const [deletingGroup, setDeletingGroup] = useState(false);
  const [confirmDeleteGroup, setConfirmDeleteGroup] = useState<{ id: string; name: string } | null>(null);
  const [confirmDeleteGroupStep, setConfirmDeleteGroupStep] = useState<1 | 2>(1);
  const [addingToGroup, setAddingToGroup] = useState(false);
  const [removingFromGroup, setRemovingFromGroup] = useState(false);
  const [error, setError] = useState("");
  const [newUsername, setNewUsername] = useState("");

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

  const selectedInTeams = useMemo(
    () =>
      [...form.teamA, ...form.teamB].filter((value) => value.length > 0),
    [form],
  );
  const playersOptionsKey = useMemo(
    () => groupPlayers.map((player) => player.id).join("|"),
    [groupPlayers],
  );

  async function loadPlayers() {
    const response = await fetch(`/api/players?t=${Date.now()}`, { cache: "no-store" });
    const data = (await response.json()) as PlayersPayload;
    setPlayers(data.players ?? []);
  }

  async function loadGroups() {
    const response = await fetch(`/api/groups?t=${Date.now()}`, { cache: "no-store" });
    const data = (await response.json()) as GroupsPayload;
    const nextGroups = data.groups ?? [];
    setGroups(nextGroups);
    if (!selectedGroupId && nextGroups[0]) {
      setSelectedGroupId(nextGroups[0].id);
      setRenameGroupName(nextGroups[0].name);
    }
  }

  async function loadGroupPlayers(groupId: string) {
    if (!groupId) {
      setGroupPlayers([]);
      return;
    }
    const response = await fetch(`/api/groups/${groupId}/players?t=${Date.now()}`, {
      cache: "no-store",
    });
    const data = (await response.json()) as PlayersPayload;
    const nextPlayers = data.players ?? [];
    setGroupPlayers(nextPlayers);
    setForm((prev) => ({
      ...prev,
      groupId,
      dealerPlayerId:
        nextPlayers.find((player) => player.id === prev.dealerPlayerId)?.id ??
        nextPlayers[0]?.id ??
        "",
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selectedGroupId) return;
    setRenameGroupName(selectedGroup?.name ?? "");
    void loadGroupPlayers(selectedGroupId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedGroupId]);

  async function createGroup() {
    const name = groupName.trim();
    if (!name) {
      setError("Upiši naziv grupe.");
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
    setGroupName("");
    await loadGroups();
    setSelectedGroupId(body.group.id);
  }

  async function renameGroup() {
    const name = renameGroupName.trim();
    if (!selectedGroupId || !name) return;
    setRenamingGroup(true);
    setError("");
    const response = await fetch(`/api/groups/${selectedGroupId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    setRenamingGroup(false);
    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      setError(body.error ?? "Greška pri preimenovanju grupe");
      return;
    }
    await loadGroups();
  }

  async function deleteSelectedGroupConfirmed() {
    if (!confirmDeleteGroup) return;
    if (confirmDeleteGroupStep === 1) {
      setConfirmDeleteGroupStep(2);
      return;
    }
    setDeletingGroup(true);
    setError("");
    const response = await fetch(`/api/groups/${confirmDeleteGroup.id}`, {
      method: "DELETE",
    });
    setDeletingGroup(false);
    setConfirmDeleteGroup(null);
    setConfirmDeleteGroupStep(1);
    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      setError(body.error ?? "Greška pri brisanju grupe");
      return;
    }
    const currentId = confirmDeleteGroup.id;
    setSelectedGroupId("");
    await loadGroups();
    if (currentId === selectedGroupId) {
      setGroupPlayers([]);
    }
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
    setExistingPlayerId("");
    await loadGroupPlayers(selectedGroupId);
  }

  async function removePlayerFromSelectedGroup(playerId: string) {
    if (!selectedGroupId || !playerId) return;
    const playerName = groupPlayers.find((player) => player.id === playerId)?.username ?? "ovog igrača";
    const confirmed = window.confirm(`Maknuti ${playerName} iz grupe?`);
    if (!confirmed) return;
    setRemovingFromGroup(true);
    setError("");
    const response = await fetch(`/api/groups/${selectedGroupId}/players`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playerId }),
    });
    setRemovingFromGroup(false);
    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      setError(body.error ?? "Greška pri brisanju igrača iz grupe");
      return;
    }
    await loadGroupPlayers(selectedGroupId);
  }

  async function createPlayerInGroup() {
    const username = newUsername.trim();
    if (!selectedGroupId) {
      setError("Prvo odaberi grupu.");
      return;
    }
    if (!username) {
      setError("Upiši username prije dodavanja.");
      return;
    }
    setCreatingPlayer(true);
    setError("");
    const response = await fetch("/api/players", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username }),
    });
    setCreatingPlayer(false);

    if (response.ok) {
      const body = (await response.json()) as { player: Player };
      await addPlayerToSelectedGroup(body.player.id);
      setNewUsername("");
      await loadPlayers();
      return;
    }

    const body = (await response.json().catch(() => ({}))) as { error?: string };
    setError(body.error ?? "Greška pri dodavanju igrača");
  }

  async function createGame() {
    if (!selectedGroupId) {
      setError("Odaberi grupu prije kreiranja partije.");
      return;
    }
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

  function playerOption(player: Player, currentValue: string) {
    const isTakenInAnotherTeamSlot =
      selectedInTeams.includes(player.id) && currentValue !== player.id;
    return (
      <option
        key={player.id}
        value={player.id}
        disabled={isTakenInAnotherTeamSlot}
      >
        {player.username}
      </option>
    );
  }

  return (
    <main className="mx-auto w-full max-w-3xl p-4 pb-20">
      <BackButton fallbackHref="/" className="mb-3" />
      <section className="card p-4">
        <h1 className="text-xl font-bold text-white">Nova partija</h1>
        {step === "groups" ? (
          <>
            <p className="text-sm text-emerald-100/90">
              Prvo odaberi ili napravi grupu igrača.
            </p>

            <div className="mt-4 rounded-xl border border-emerald-600/50 bg-emerald-950/30 p-3">
              <p className="mb-2 text-sm font-semibold text-emerald-200">Nova grupa</p>
              <form
                className="flex gap-2"
                onSubmit={(event) => {
                  event.preventDefault();
                  void createGroup();
                }}
              >
                <input
                  value={groupName}
                  onChange={(event) => setGroupName(event.target.value)}
                  className="w-full rounded-xl border border-emerald-600/60 bg-emerald-950/40 px-3 py-2 text-emerald-50"
                  placeholder="Naziv nove grupe"
                />
                <button
                  type="submit"
                  disabled={creatingGroup}
                  className="rounded-xl bg-lime-400 px-4 font-semibold text-emerald-950 disabled:opacity-60"
                >
                  {creatingGroup ? "Spremam..." : "Dodaj"}
                </button>
              </form>
            </div>

            <div className="mt-4">
              <label className="text-sm text-emerald-100">
                Postojeće grupe
                <select
                  className="mt-1 w-full rounded-xl border border-emerald-600/60 bg-emerald-950/40 px-3 py-2 text-emerald-50"
                  value={selectedGroupId}
                  onChange={(event) => setSelectedGroupId(event.target.value)}
                >
                  <option value="">Odaberi grupu</option>
                  {groups.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {selectedGroup ? (
              <>
                <form
                  className="mt-3 flex gap-2"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void renameGroup();
                  }}
                >
                  <input
                    value={renameGroupName}
                    onChange={(event) => setRenameGroupName(event.target.value)}
                    className="w-full rounded-xl border border-emerald-600/60 bg-emerald-950/40 px-3 py-2 text-emerald-50"
                    placeholder="Promijeni naziv grupe"
                  />
                  <button
                    type="submit"
                    disabled={renamingGroup}
                    className="rounded-xl border border-emerald-500 px-4 font-semibold text-emerald-100 disabled:opacity-60"
                  >
                    {renamingGroup ? "Spremam..." : "Preimenuj"}
                  </button>
                </form>
                <button
                  type="button"
                  disabled={deletingGroup}
                  onClick={() =>
                    setConfirmDeleteGroup({
                      id: selectedGroup.id,
                      name: selectedGroup.name,
                    })
                  }
                  className="mt-2 rounded-xl border border-rose-400/70 px-4 py-2 text-sm font-semibold text-rose-200 disabled:opacity-60"
                >
                  {deletingGroup ? "Brišem grupu..." : "Obriši grupu"}
                </button>

                <form
                  className="mt-3 flex gap-2"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void createPlayerInGroup();
                  }}
                >
                  <input
                    value={newUsername}
                    onChange={(event) => setNewUsername(event.target.value)}
                    className="w-full rounded-xl border border-emerald-600/60 bg-emerald-950/40 px-3 py-2 text-emerald-50"
                    placeholder="Novi username za grupu"
                    autoCapitalize="none"
                    autoCorrect="off"
                  />
                  <button
                    type="submit"
                    disabled={creatingPlayer || addingToGroup}
                    className="rounded-xl bg-lime-400 px-4 font-semibold text-emerald-950 disabled:opacity-60"
                  >
                    {creatingPlayer || addingToGroup ? "Dodajem..." : "Dodaj"}
                  </button>
                </form>

                <div className="mt-3 flex gap-2">
                  <select
                    value={existingPlayerId}
                    onChange={(event) => setExistingPlayerId(event.target.value)}
                    className="w-full rounded-xl border border-emerald-600/60 bg-emerald-950/40 px-3 py-2 text-emerald-50"
                  >
                    <option value="">Dodaj postojećeg igrača u grupu</option>
                    {players
                      .filter((player) => !groupPlayers.some((member) => member.id === player.id))
                      .map((player) => (
                        <option key={player.id} value={player.id}>
                          {player.username}
                        </option>
                      ))}
                  </select>
                  <button
                    type="button"
                    disabled={!existingPlayerId || addingToGroup}
                    onClick={() => void addPlayerToSelectedGroup(existingPlayerId)}
                    className="rounded-xl border border-emerald-500 px-4 font-semibold text-emerald-100 disabled:opacity-60"
                  >
                    Dodaj
                  </button>
                </div>

                <div className="mt-3 rounded-xl border border-emerald-700/40 bg-emerald-950/40 p-3">
                  <p className="text-sm font-semibold text-emerald-200">Igrači u grupi</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {groupPlayers.map((player) => (
                      <button
                        key={player.id}
                        type="button"
                        disabled={removingFromGroup}
                        onClick={() => void removePlayerFromSelectedGroup(player.id)}
                        className="rounded-full border border-emerald-600/60 px-3 py-1 text-sm text-emerald-100 disabled:opacity-60"
                        title="Ukloni igrača iz grupe"
                      >
                        {player.username} ×
                      </button>
                    ))}
                    {groupPlayers.length === 0 ? (
                      <span className="text-sm text-emerald-300/90">Nema igrača u grupi.</span>
                    ) : null}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setStep("setup")}
                  disabled={groupPlayers.length < 4}
                  className="mt-4 w-full rounded-xl bg-lime-400 py-3 font-semibold text-emerald-950 disabled:opacity-60"
                >
                  Nastavi na postavu partije
                </button>
              </>
            ) : null}
          </>
        ) : (
          <>
            <p className="text-sm text-emerald-100/90">
              Grupa: <span className="font-semibold text-white">{selectedGroup?.name ?? "-"}</span>
            </p>
            <button
              type="button"
              className="mt-2 rounded-lg border border-emerald-500 px-3 py-2 text-sm font-semibold text-emerald-100"
              onClick={() => setStep("groups")}
            >
              Natrag na grupe
            </button>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <label className="col-span-2 text-sm text-emerald-100">
                Prvi djelitelj
                <select
                  key={`dealer-${playersOptionsKey}`}
                  value={form.dealerPlayerId}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, dealerPlayerId: event.target.value }))
                  }
                  className="mt-1 w-full rounded-xl border border-emerald-600/60 bg-emerald-950/40 px-3 py-2 text-emerald-50"
                >
                  <option value="">Odaberi igrača</option>
                  {groupPlayers.map((player) => (
                    <option key={player.id} value={player.id}>
                      {player.username}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-sm text-emerald-100">
                Tim A - Igrač 1
                <select
                  key={`teamA-0-${playersOptionsKey}`}
                  className="mt-1 w-full rounded-xl border border-emerald-600/60 bg-emerald-950/40 px-3 py-2 text-emerald-50"
                  value={form.teamA[0]}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, teamA: [event.target.value, prev.teamA[1]] }))
                  }
                >
                  <option value="">Odaberi</option>
                  {groupPlayers.map((player) => playerOption(player, form.teamA[0]))}
                </select>
              </label>
              <label className="text-sm text-emerald-100">
                Tim A - Igrač 2
                <select
                  key={`teamA-1-${playersOptionsKey}`}
                  className="mt-1 w-full rounded-xl border border-emerald-600/60 bg-emerald-950/40 px-3 py-2 text-emerald-50"
                  value={form.teamA[1]}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, teamA: [prev.teamA[0], event.target.value] }))
                  }
                >
                  <option value="">Odaberi</option>
                  {groupPlayers.map((player) => playerOption(player, form.teamA[1]))}
                </select>
              </label>
              <label className="text-sm text-emerald-100">
                Tim B - Igrač 1
                <select
                  key={`teamB-0-${playersOptionsKey}`}
                  className="mt-1 w-full rounded-xl border border-emerald-600/60 bg-emerald-950/40 px-3 py-2 text-emerald-50"
                  value={form.teamB[0]}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, teamB: [event.target.value, prev.teamB[1]] }))
                  }
                >
                  <option value="">Odaberi</option>
                  {groupPlayers.map((player) => playerOption(player, form.teamB[0]))}
                </select>
              </label>
              <label className="text-sm text-emerald-100">
                Tim B - Igrač 2
                <select
                  key={`teamB-1-${playersOptionsKey}`}
                  className="mt-1 w-full rounded-xl border border-emerald-600/60 bg-emerald-950/40 px-3 py-2 text-emerald-50"
                  value={form.teamB[1]}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, teamB: [prev.teamB[0], event.target.value] }))
                  }
                >
                  <option value="">Odaberi</option>
                  {groupPlayers.map((player) => playerOption(player, form.teamB[1]))}
                </select>
              </label>
            </div>

            <button
              type="button"
              onClick={createGame}
              disabled={loading}
              className="mt-4 w-full rounded-xl bg-lime-400 py-3 font-semibold text-emerald-950 disabled:opacity-60"
            >
              {loading ? "Kreiram..." : "Pokreni partiju"}
            </button>
          </>
        )}

        {error ? <p className="mt-3 text-sm text-rose-300">{error}</p> : null}
      </section>

      {confirmDeleteGroup ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-emerald-600/50 bg-emerald-950 p-4 shadow-2xl">
            <h3 className="text-base font-bold text-white">Potvrda brisanja grupe</h3>
            <p className="mt-2 text-sm text-emerald-100">
              {confirmDeleteGroupStep === 1
                ? `Želiš li obrisati grupu "${confirmDeleteGroup.name}"?`
                : "Jesi li stvarno siguran? Ova radnja trajno briše grupu i članove iz te grupe."}
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setConfirmDeleteGroup(null);
                  setConfirmDeleteGroupStep(1);
                }}
                className="rounded-lg border border-emerald-500 px-3 py-2 text-sm font-semibold text-emerald-100"
              >
                Odustani
              </button>
              <button
                type="button"
                onClick={() => void deleteSelectedGroupConfirmed()}
                disabled={deletingGroup}
                className="rounded-lg border border-rose-400/70 bg-rose-900/30 px-3 py-2 text-sm font-semibold text-rose-200 disabled:opacity-60"
              >
                {confirmDeleteGroupStep === 1 ? "Nastavi" : deletingGroup ? "Brišem..." : "Obriši trajno"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
