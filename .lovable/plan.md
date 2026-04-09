## Full Game Portal Implementation Plan

### Phase 1: Database Setup
- Create `game_scores` table (user_id, game_name, score, points_earned, created_at)
- Create `game_points` table or add `game_points` column to profiles
- Create `daily_missions` table (user_id, mission_type, progress, completed, date)
- Create `game_leaderboard` view
- RLS policies for all tables

### Phase 2: Core Game Pages
- **Games Portal** (`/games`) - Grid of all 10 games with cards
- **Individual Game Page** (`/games/:game-name`) - Game canvas + controls
- **Leaderboard** (`/games/leaderboard`) - Top players
- **Daily Missions** section on games page

### Phase 3: 10 HTML5 Mini Games (React components)
1. Tic-Tac-Toe
2. Snake
3. Flappy Bird
4. Memory Match
5. Click Speed Test
6. 2048
7. Whack-a-Mole
8. Car Dodge
9. Quiz (Myanmar trivia)
10. Reaction Time

### Phase 4: Game Points & Rewards
- Play game → +5 game points
- Win → +20 game points
- High score → +10 bonus
- Daily login → +10
- Daily limit: 500 pts
- Anti-cheat: 30sec cooldown per game
- Game points display in header

### Phase 5: Gamification
- Daily missions (Play 3 games → +30 pts)
- 7-day streak bonus
- Lucky Spin (1 free/day)
- Leaderboard (top 10)

### Phase 6: Offline Support
- Detect network status
- Show offline games page when no internet
- Games work without backend (scores saved locally, synced when online)

### Phase 7: Myanmar Language + UI Polish
- Myanmar language toggle for game UI
- Sound effects toggle
- Animations and transitions

**Note:** All games run client-side in React. Points are stored separately from existing coins system. Admin can manage game settings from existing admin panel.