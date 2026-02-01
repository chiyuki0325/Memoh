-- name: GetSettingsByUserID :one
SELECT user_id, chat_model_id, memory_model_id, embedding_model_id, max_context_load_time, language
FROM user_settings
WHERE user_id = $1;

-- name: UpsertSettings :one
INSERT INTO user_settings (user_id, chat_model_id, memory_model_id, embedding_model_id, max_context_load_time, language)
VALUES ($1, $2, $3, $4, $5, $6)
ON CONFLICT (user_id) DO UPDATE SET
  chat_model_id = EXCLUDED.chat_model_id,
  memory_model_id = EXCLUDED.memory_model_id,
  embedding_model_id = EXCLUDED.embedding_model_id,
  max_context_load_time = EXCLUDED.max_context_load_time,
  language = EXCLUDED.language
RETURNING user_id, chat_model_id, memory_model_id, embedding_model_id, max_context_load_time, language;

-- name: DeleteSettingsByUserID :exec
DELETE FROM user_settings
WHERE user_id = $1;

