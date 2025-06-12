# Nhập môn công nghệ phần mềm

# Technology
- USING googleCloud to Speech to text
- Apply AI for response

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

