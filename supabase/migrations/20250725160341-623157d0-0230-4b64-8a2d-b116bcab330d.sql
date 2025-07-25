-- Add latitude and longitude columns to emergencies table
ALTER TABLE emergencies 
ADD COLUMN latitude DOUBLE PRECISION,
ADD COLUMN longitude DOUBLE PRECISION;

-- Create index for geospatial queries
CREATE INDEX idx_emergencies_location ON emergencies (latitude, longitude);

-- Add comments
COMMENT ON COLUMN emergencies.latitude IS 'Latitude coordinate of emergency center';
COMMENT ON COLUMN emergencies.longitude IS 'Longitude coordinate of emergency center';