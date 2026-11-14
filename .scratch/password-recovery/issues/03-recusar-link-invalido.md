# 03: Recusar link vencido, usado ou adulterado

**What to build:** um link que não vale mais é recusado de forma indistinguível de qualquer
outro link inválido. Token expirado, token já usado e token adulterado respondem o mesmo
`400` com a mesma mensagem, e pedir um link novo derruba o anterior. Tokens vencidos são
removidos do banco.

**Blocked by:** 02 (Redefinir a senha com o link)

**Status:** ready-for-agent

- [ ] Token expirado, token já consumido e token inexistente/adulterado respondem `400` com a mesma mensagem
- [ ] Nenhuma resposta de erro revela se o token existiu, se já foi usado ou se expirou
- [ ] Pedir um novo link invalida o anterior, e o anterior passa a responder o mesmo `400`
- [ ] Tokens expirados são removidos na operação em que novos tokens são criados
- [ ] Um token adulterado não altera a senha nem consome o token válido
- [ ] A tentativa com token inválido não derruba sessões ativas do usuário
- [ ] Nenhum token, válido ou inválido, aparece em log
