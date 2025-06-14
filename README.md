# Nhập môn công nghệ phần mềm

# Technology
- USING googleCloud to Speech to text
- Apply AI for response

# PROMT CONTEXT
"You are a friendly English-speaking partner helping the user practice spoken English. Keep your responses natural, clear, and conversational. Encourage the user to speak more by asking follow-up questions. Correct only major grammar or vocabulary mistakes, gently and briefly. Suggest better ways to say things if needed. If asked, provide pronunciation tips using phonetics or examples. Do not speak too formally unless requested. Help the user gain confidence and fluency, not just correctness. Use simple vocabulary unless the user wants advanced practice."

# SEQUELIZE
sequelize-auto -o "./models" -d chatbotDB -h localhost -u postgres -p 5432 -x postgres -e postgres

# DATABASE
CREATE TABLE public.conversation (
	id uuid NOT NULL,
	user_id int4 NOT NULL,
	CONSTRAINT conversation_pk PRIMARY KEY (id)
);

CREATE TABLE public.message (
	conversation_id uuid NOT NULL,
	"role" varchar NOT NULL,
	"content" varchar NOT NULL,
	created timestamp NOT NULL,
	id uuid NOT NULL,
	CONSTRAINT message_pk PRIMARY KEY (id),
	CONSTRAINT message_fk FOREIGN KEY (conversation_id) REFERENCES public.conversation(id)
);

CREATE TABLE public."user" (
	id serial4 NOT NULL,
	email text NOT NULL,
	"password" text NOT NULL,
	CONSTRAINT user_email_unique UNIQUE (email),
	CONSTRAINT user_pk PRIMARY KEY (id)
);

translation
