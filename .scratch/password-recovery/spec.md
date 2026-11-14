# Spec: Recuperação de senha

**Status:** ready-for-agent

## Problem Statement

Aluno ou professor esquece a senha e não consegue mais entrar na conta. Hoje não existe
nenhum caminho de volta: a senha só pode ser definida no cadastro, então a conta fica
inacessível para sempre. Quem esqueceu precisa criar outra conta e perde o histórico de
reservas e horários.

## Solution

Um fluxo de dois passos por email:

1. A pessoa informa o email e recebe um link com um token de uso único, válido por 30 minutos.
2. A pessoa abre o link e define uma nova senha.

A resposta ao pedido é sempre a mesma, exista ou não a conta, para que ninguém use o
endpoint para descobrir quais emails estão cadastrados. Ao concluir a troca, todas as
sessões ativas daquela conta são encerradas e a pessoa não é autenticada automaticamente.

## User Stories

1. Como pessoa que esqueceu a senha, quero informar meu email e receber um link de recuperação, para que eu consiga voltar a acessar minha conta.
2. Como pessoa que não tem conta, quero receber a mesma resposta de quem tem, para que eu não consiga descobrir quem está cadastrado.
3. Como pessoa que pediu o link, quero que ele expire em 30 minutos, para que um link esquecido em uma caixa de email antiga não continue valendo.
4. Como pessoa que pediu o link, quero que ele funcione uma única vez, para que ninguém que o encontre depois possa reutilizá-lo.
5. Como pessoa que pediu um novo link, quero que o anterior pare de funcionar, para que eu não fique com vários links válidos ao mesmo tempo.
6. Como pessoa que abriu o link, quero definir uma nova senha e entrar com ela, para que eu recupere o acesso.
7. Como pessoa que trocou a senha, quero que a senha antiga deixe de funcionar, para que quem a tinha não consiga mais entrar.
8. Como pessoa que trocou a senha porque desconfiava de invasão, quero que todas as sessões abertas sejam encerradas, para que o invasor seja expulso.
9. Como pessoa que trocou a senha, quero continuar sem estar logado, para que eu confirme que sei a nova senha antes de entrar.
10. Como pessoa que recebeu um link expirado, quero uma mensagem clara de que ele não vale mais, para que eu saiba pedir outro.
11. Como pessoa que recebeu um link já usado, quero a mesma resposta de link inválido, para que eu não descubra se ele já foi usado por outra pessoa.
12. Como pessoa que digita um token adulterado, quero ser recusado, para que adivinhar tokens não seja um caminho de entrada.
13. Como professor ou aluno, quero que a nova senha siga a mesma regra do cadastro, para que o comportamento seja previsível.
14. Como operador do sistema, quero que os tokens sejam guardados de forma que um vazamento do banco não permita usá-los, para que o dano fique contido.

## Implementation Decisions

**Endpoints**

- `POST /users/password-reset` — recebe `email`. Responde sempre `202 Accepted` com uma
  mensagem genérica ("Se o email existir, enviaremos instruções"). Não diferencia email
  válido, inválido ou inexistente em status, corpo ou mensagem.
- `POST /users/password-reset/confirm` — recebe `token` e `password`. Responde `204 No Content`
  em caso de sucesso e `400` com a mesma mensagem para token inválido, expirado ou já usado.
  Não cria sessão.

**Persistência**

- Nova migration `005`, aditiva, criando `password_reset_tokens` com: identificador, referência
  ao usuário, hash do token, data de expiração, data de uso (nula enquanto não usado) e data
  de criação.
- Índice para busca pelo hash do token e índice parcial para localizar tokens ativos de um usuário.
- Ao pedir um novo link, os tokens ativos anteriores daquele usuário são invalidados, de modo
  que só o último pedido vale.
- Tokens expirados e usados podem ser removidos na mesma operação em que novos são criados.

**Token**

- 32 bytes gerados aleatoriamente (CSPRNG do Node), codificados em base64url para o link.
- No banco, apenas o hash SHA-256 do token. O valor em claro existe só no email.
- Expiração de 30 minutos contada a partir da criação; uso único.
- A comparação do token recebido é feita pelo hash, nunca pelo valor em claro.

**Senha**

- A nova senha segue exatamente a validação já usada no cadastro (string não vazia).
- Hash com Argon2, reutilizando a mesma função do cadastro.

**Efeitos colaterais**

- Envio do email reutiliza o módulo de email existente (Resend), com o link montado a partir
  de uma variável de ambiente de URL base do app. Nenhuma URL é fixada no código.
- Ao concluir a troca: atualizar o hash, marcar o token como usado e apagar todas as sessões
  daquele usuário.
- Se o envio do email falhar, o endpoint continua respondendo `202` e o erro é logado. O
  token criado permanece válido; um novo pedido gera outro link.

**Segurança**

- A resposta ao pedido não revela existência da conta.
- O token não aparece em logs.
- Nenhum endpoint novo exige autenticação — o token é a credencial.
- O fluxo não altera `role`, `name` ou `email`; só a senha.

## Testing Decisions

- Não existe suíte automatizada neste repo, e a criação de uma está fora do escopo desta spec.
- O seam escolhido é o **HTTP**: os dois endpoints, exercitados por requisições reais, com o
  banco real. Nenhum teste deve chamar funções internas de geração de token ou de hash.
- Um bom teste aqui: dada uma conta existente, pedir o link, extrair o token do registro
  criado, confirmar a troca, e verificar que (a) a senha nova autentica, (b) a antiga não,
  (c) as sessões anteriores caíram, (d) o mesmo token não funciona de novo.
- Quando a suíte existir, esses são os primeiros candidatos a teste de integração, no mesmo
  estilo dos fluxos já documentados no README.
- Verificação manual enquanto não houver suíte: o passo a passo do README (criar conta, login,
  pedir link, confirmar, tentar login com as duas senhas).

## Out of Scope

- Rate limit no pedido de recuperação (funcionalidade seguinte).
- Confirmação de email no cadastro.
- Alteração de email ou de nome.
- Telas de frontend; o fluxo é validado via cliente HTTP.
- Regras de força de senha além da regra atual do cadastro.
- Bloqueio de conta, notificação de "senha alterada" por email e histórico de alterações.

## Further Notes

- A ordem importa: este fluxo define o padrão de token de uso único por email que será
  reaproveitado na confirmação de email e no convite de professor.
- A mensagem genérica é decisão de segurança, não de UX. O frontend pode explicar ao usuário
  o que fazer a seguir sem que a API confirme se o email existe.
