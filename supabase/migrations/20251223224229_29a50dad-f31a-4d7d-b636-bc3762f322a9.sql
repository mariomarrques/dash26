-- Create teams table for global team suggestions
CREATE TABLE public.teams (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  country TEXT NOT NULL,
  league TEXT,
  name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  user_id UUID REFERENCES auth.users(id)
);

-- Create indexes for fast lookups
CREATE INDEX idx_teams_country ON public.teams(country);
CREATE INDEX idx_teams_country_name ON public.teams(country, name);

-- Enable RLS
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

-- Teams are readable by all authenticated users (global suggestions)
CREATE POLICY "Authenticated users can view all teams"
ON public.teams FOR SELECT
TO authenticated
USING (true);

-- Users can insert new teams
CREATE POLICY "Authenticated users can insert teams"
ON public.teams FOR INSERT
TO authenticated
WITH CHECK (true);

-- Add season and team_id to products
ALTER TABLE public.products 
ADD COLUMN season TEXT,
ADD COLUMN team_id UUID REFERENCES public.teams(id);

-- Create index for team_id lookups
CREATE INDEX idx_products_team_id ON public.products(team_id);

-- Seed initial teams data
INSERT INTO public.teams (country, league, name) VALUES
-- England - Premier League
('Inglaterra', 'Premier League', 'Arsenal'),
('Inglaterra', 'Premier League', 'Aston Villa'),
('Inglaterra', 'Premier League', 'Bournemouth'),
('Inglaterra', 'Premier League', 'Brentford'),
('Inglaterra', 'Premier League', 'Brighton'),
('Inglaterra', 'Premier League', 'Chelsea'),
('Inglaterra', 'Premier League', 'Crystal Palace'),
('Inglaterra', 'Premier League', 'Everton'),
('Inglaterra', 'Premier League', 'Fulham'),
('Inglaterra', 'Premier League', 'Ipswich Town'),
('Inglaterra', 'Premier League', 'Leicester City'),
('Inglaterra', 'Premier League', 'Liverpool'),
('Inglaterra', 'Premier League', 'Manchester City'),
('Inglaterra', 'Premier League', 'Manchester United'),
('Inglaterra', 'Premier League', 'Newcastle United'),
('Inglaterra', 'Premier League', 'Nottingham Forest'),
('Inglaterra', 'Premier League', 'Southampton'),
('Inglaterra', 'Premier League', 'Tottenham'),
('Inglaterra', 'Premier League', 'West Ham'),
('Inglaterra', 'Premier League', 'Wolverhampton'),
-- Spain - La Liga
('Espanha', 'La Liga', 'Athletic Bilbao'),
('Espanha', 'La Liga', 'Atlético de Madrid'),
('Espanha', 'La Liga', 'Barcelona'),
('Espanha', 'La Liga', 'Celta de Vigo'),
('Espanha', 'La Liga', 'Getafe'),
('Espanha', 'La Liga', 'Girona'),
('Espanha', 'La Liga', 'Las Palmas'),
('Espanha', 'La Liga', 'Mallorca'),
('Espanha', 'La Liga', 'Osasuna'),
('Espanha', 'La Liga', 'Rayo Vallecano'),
('Espanha', 'La Liga', 'Real Betis'),
('Espanha', 'La Liga', 'Real Madrid'),
('Espanha', 'La Liga', 'Real Sociedad'),
('Espanha', 'La Liga', 'Sevilla'),
('Espanha', 'La Liga', 'Valencia'),
('Espanha', 'La Liga', 'Villarreal'),
-- Italy - Serie A
('Itália', 'Serie A', 'Atalanta'),
('Itália', 'Serie A', 'Bologna'),
('Itália', 'Serie A', 'Fiorentina'),
('Itália', 'Serie A', 'Inter de Milão'),
('Itália', 'Serie A', 'Juventus'),
('Itália', 'Serie A', 'Lazio'),
('Itália', 'Serie A', 'Milan'),
('Itália', 'Serie A', 'Napoli'),
('Itália', 'Serie A', 'Roma'),
('Itália', 'Serie A', 'Torino'),
-- Germany - Bundesliga
('Alemanha', 'Bundesliga', 'Bayer Leverkusen'),
('Alemanha', 'Bundesliga', 'Bayern de Munique'),
('Alemanha', 'Bundesliga', 'Borussia Dortmund'),
('Alemanha', 'Bundesliga', 'Borussia Mönchengladbach'),
('Alemanha', 'Bundesliga', 'Eintracht Frankfurt'),
('Alemanha', 'Bundesliga', 'Freiburg'),
('Alemanha', 'Bundesliga', 'Hoffenheim'),
('Alemanha', 'Bundesliga', 'Leipzig'),
('Alemanha', 'Bundesliga', 'Stuttgart'),
('Alemanha', 'Bundesliga', 'Union Berlin'),
('Alemanha', 'Bundesliga', 'Wolfsburg'),
-- France - Ligue 1
('França', 'Ligue 1', 'Lens'),
('França', 'Ligue 1', 'Lille'),
('França', 'Ligue 1', 'Lyon'),
('França', 'Ligue 1', 'Marselha'),
('França', 'Ligue 1', 'Monaco'),
('França', 'Ligue 1', 'Nice'),
('França', 'Ligue 1', 'Paris Saint-Germain'),
('França', 'Ligue 1', 'Rennes'),
('França', 'Ligue 1', 'Strasbourg'),
-- Portugal - Primeira Liga
('Portugal', 'Primeira Liga', 'Benfica'),
('Portugal', 'Primeira Liga', 'Braga'),
('Portugal', 'Primeira Liga', 'Porto'),
('Portugal', 'Primeira Liga', 'Sporting'),
-- Brazil - Série A
('Brasil', 'Série A', 'Atlético Mineiro'),
('Brasil', 'Série A', 'Athletico Paranaense'),
('Brasil', 'Série A', 'Bahia'),
('Brasil', 'Série A', 'Botafogo'),
('Brasil', 'Série A', 'Corinthians'),
('Brasil', 'Série A', 'Cruzeiro'),
('Brasil', 'Série A', 'Flamengo'),
('Brasil', 'Série A', 'Fluminense'),
('Brasil', 'Série A', 'Fortaleza'),
('Brasil', 'Série A', 'Grêmio'),
('Brasil', 'Série A', 'Internacional'),
('Brasil', 'Série A', 'Palmeiras'),
('Brasil', 'Série A', 'Santos'),
('Brasil', 'Série A', 'São Paulo'),
('Brasil', 'Série A', 'Vasco'),
('Brasil', 'Série A', 'Vitória'),
-- Argentina - Primera División
('Argentina', 'Primera División', 'Boca Juniors'),
('Argentina', 'Primera División', 'River Plate'),
('Argentina', 'Primera División', 'Racing'),
('Argentina', 'Primera División', 'Independiente'),
('Argentina', 'Primera División', 'San Lorenzo'),
('Argentina', 'Primera División', 'Estudiantes'),
('Argentina', 'Primera División', 'Vélez Sarsfield'),
-- USA - MLS
('EUA', 'MLS', 'Atlanta United'),
('EUA', 'MLS', 'Austin FC'),
('EUA', 'MLS', 'Charlotte FC'),
('EUA', 'MLS', 'Chicago Fire'),
('EUA', 'MLS', 'FC Cincinnati'),
('EUA', 'MLS', 'Colorado Rapids'),
('EUA', 'MLS', 'Columbus Crew'),
('EUA', 'MLS', 'DC United'),
('EUA', 'MLS', 'FC Dallas'),
('EUA', 'MLS', 'Houston Dynamo'),
('EUA', 'MLS', 'Inter Miami'),
('EUA', 'MLS', 'LA Galaxy'),
('EUA', 'MLS', 'Los Angeles FC'),
('EUA', 'MLS', 'Minnesota United'),
('EUA', 'MLS', 'Montreal'),
('EUA', 'MLS', 'Nashville SC'),
('EUA', 'MLS', 'New England Revolution'),
('EUA', 'MLS', 'New York City FC'),
('EUA', 'MLS', 'New York Red Bulls'),
('EUA', 'MLS', 'Orlando City'),
('EUA', 'MLS', 'Philadelphia Union'),
('EUA', 'MLS', 'Portland Timbers'),
('EUA', 'MLS', 'Real Salt Lake'),
('EUA', 'MLS', 'San Jose Earthquakes'),
('EUA', 'MLS', 'Seattle Sounders'),
('EUA', 'MLS', 'Sporting Kansas City'),
('EUA', 'MLS', 'St. Louis City SC'),
('EUA', 'MLS', 'Toronto FC'),
('EUA', 'MLS', 'Vancouver Whitecaps'),
-- Mexico - Liga MX
('México', 'Liga MX', 'América'),
('México', 'Liga MX', 'Atlas'),
('México', 'Liga MX', 'Chivas'),
('México', 'Liga MX', 'Cruz Azul'),
('México', 'Liga MX', 'León'),
('México', 'Liga MX', 'Monterrey'),
('México', 'Liga MX', 'Pachuca'),
('México', 'Liga MX', 'Pumas'),
('México', 'Liga MX', 'Santos Laguna'),
('México', 'Liga MX', 'Tigres'),
('México', 'Liga MX', 'Toluca');