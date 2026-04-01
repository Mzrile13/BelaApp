create or replace view player_round_stats as
with player_game_team as (
  select
    g.id as game_id,
    p.id as player_id,
    case
      when (g.teams->'teamA') ?| array[p.id::text] then 'A'
      else 'B'
    end as team_id
  from games g
  join players p on (
    (g.teams->'teamA') ?| array[p.id::text]
    or (g.teams->'teamB') ?| array[p.id::text]
  )
)
select
  pr.player_id,
  r.game_id,
  r.round_number,
  case when pr.team_id = 'A' then r.points_team_a else r.points_team_b end as points_for,
  case when pr.team_id = 'A' then r.points_team_b else r.points_team_a end as points_against,
  case
    when pr.player_id = r.zvanja_player_id_a then r.zvanja_team_a
    when pr.player_id = r.zvanja_player_id_b then r.zvanja_team_b
    else 0
  end as zvanja_for,
  (r.caller_player_id = pr.player_id) as is_caller,
  r.caller_succeeded
from rounds r
join player_game_team pr on pr.game_id = r.game_id;

create or replace view player_aggregate_stats as
select
  p.id as player_id,
  p.username,
  count(prs.*)::int as rounds_played,
  coalesce(sum(prs.points_for), 0)::int as points_won,
  coalesce(sum(prs.points_against), 0)::int as points_against,
  coalesce(avg(prs.points_for), 0)::numeric(10,2) as avg_points,
  coalesce(sum(prs.zvanja_for), 0)::int as zvanja_total,
  coalesce(avg(prs.zvanja_for), 0)::numeric(10,2) as avg_zvanja,
  coalesce(sum(case when prs.is_caller then 1 else 0 end), 0)::int as times_called,
  coalesce(
    avg(case when prs.is_caller and prs.caller_succeeded then 1 else 0 end),
    0
  )::numeric(10,4) as caller_succeeded_rate
from players p
left join player_round_stats prs on prs.player_id = p.id
group by p.id, p.username;
