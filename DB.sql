-- ============================================================
-- FitAlchemy Database - Full Reset
-- Run this entire file in MySQL Workbench
-- ============================================================

DROP DATABASE IF EXISTS fitalchemy_db;
CREATE DATABASE fitalchemy_db;
USE fitalchemy_db;

-- Users table (with full profile fields + profile image)
CREATE TABLE users (
  id                  INT AUTO_INCREMENT PRIMARY KEY,
  email               VARCHAR(255) NOT NULL UNIQUE,
  password            VARCHAR(255) NOT NULL,
  full_name           VARCHAR(100),
  age                 INT,
  height              DECIMAL(5,2),
  weight              DECIMAL(5,2),
  fitness_goal        VARCHAR(200),
  dietary_preference  VARCHAR(200),
  profile_image       LONGTEXT,
  created_at          DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Routines table
CREATE TABLE routines (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  user_id     INT NOT NULL,
  name        VARCHAR(255),
  description TEXT,
  day         VARCHAR(20),
  reps        INT,
  category    VARCHAR(50),
  image        VARCHAR(255),
  planned_date DATE,
  is_completed TINYINT(1) DEFAULT 0,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Meal plans table
CREATE TABLE meal_plans (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  user_id          INT NOT NULL,
  recipe_id        INT,
  title            VARCHAR(255),
  image            VARCHAR(255),
  day              VARCHAR(20),
  meal             VARCHAR(20),
  source_url       VARCHAR(500),
  calories         DECIMAL(8,2),
  protein          DECIMAL(8,2),
  carbs            DECIMAL(8,2),
  fat              DECIMAL(8,2),
  ready_in_minutes INT,
  servings         INT,
  ingredients      TEXT,
  instructions     TEXT,
  planned_date     DATE,
  is_completed     TINYINT(1) DEFAULT 0,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Chatbot logs table
CREATE TABLE chatbot_logs (
  log_id        INT AUTO_INCREMENT PRIMARY KEY,
  user_id       INT NOT NULL,
  user_message  TEXT NOT NULL,
  bot_response  TEXT NOT NULL,
  timestamp     DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Health status table
CREATE TABLE health_status (
  healthStatus_id  INT AUTO_INCREMENT PRIMARY KEY,
  user_id          INT NOT NULL,
  physical_status  VARCHAR(50),
  fitness_status   VARCHAR(50),
  mental_status    VARCHAR(50),
  evaluated_date   DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Weekly reports table
CREATE TABLE weekly_reports (
  id                INT AUTO_INCREMENT PRIMARY KEY,
  user_id           INT NOT NULL,
  week_start        DATE NOT NULL,
  week_end          DATE NOT NULL,
  total_workouts    INT DEFAULT 0,
  total_workout_min INT DEFAULT 0,
  total_calories_burnt DECIMAL(8,2) DEFAULT 0,
  total_meals       INT DEFAULT 0,
  total_calories_in DECIMAL(8,2) DEFAULT 0,
  total_protein     DECIMAL(8,2) DEFAULT 0,
  total_carbs       DECIMAL(8,2) DEFAULT 0,
  total_fat         DECIMAL(8,2) DEFAULT 0,
  generated_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Favorites table
CREATE TABLE favorites (
  id       INT AUTO_INCREMENT PRIMARY KEY,
  user_id  INT NOT NULL,
  type     VARCHAR(50),
  content  JSON,
  saved_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
