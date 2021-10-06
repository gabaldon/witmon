import { FastifyPluginAsync, FastifyRequest } from 'fastify'
import { MINT_PRIVATE_KEY } from '../constants'
import Web3 from 'web3'

import { EggRepository } from '../repositories/egg'
import {
  AuthorizationHeader,
  JwtVerifyPayload,
  MintOutput,
  MintParams,
} from '../types'

const mint: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
  if (!fastify.mongo.db) throw Error('mongo db not found')
  const eggRepository = new EggRepository(fastify.mongo.db)

  fastify.post<{ Body: MintParams; Reply: MintOutput | Error }>('/mint', {
    schema: {
      body: MintParams,
      headers: AuthorizationHeader,
      response: {
        200: MintOutput,
      },
    },
    handler: async (request: FastifyRequest<{ Body: MintParams }>, reply) => {
      // Check 1: token is valid
      let fromId: string
      try {
        const decoded: JwtVerifyPayload = fastify.jwt.verify(
          request.headers.authorization as string
        )
        fromId = decoded.id
      } catch (err) {
        return reply.status(403).send(new Error(`Forbidden: invalid token`))
      }

      // Check 2 (unreachable): valid server issued token refers to non-existent egg
      const egg = await eggRepository.get(fromId)
      if (!egg) {
        return reply
          .status(404)
          .send(new Error(`Egg does not exist (key: ${fromId})`))
      }

      // Check 3 (unreachable): incubating player egg has been claimed
      if (!egg.token) {
        return reply
          .status(409)
          .send(
            new Error(`Player egg should be claimed before incubating others`)
          )
      }

      const web3 = new Web3()
      // Check address is valid
      if (!web3.utils.isAddress(request.body.address)) {
        return reply
          .status(409)
          .send(new Error(`Mint address should be a valid Ethereum addresss`))
      }

      // Build message to sign
      const rank = await eggRepository.calculateRarityIndex(egg)
      const total = await eggRepository.countClaimed()

      const message = web3.utils.encodePacked(
        request.body.address,
        egg.index,
        rank,
        total
      )

      if (!message) {
        throw Error('Mint failed because signature message is empty')
      }

      // Sign message (uses keccak256 internally)
      const envelopedSignature = web3.eth.accounts.sign(
        message,
        MINT_PRIVATE_KEY
      )

      const response = {
        envelopedSignature,
        data: {
          address: request.body.address,
          index: egg.index,
          rank,
          total,
          // eggColor: 0,
        },
      }

      return reply.status(200).send(response)
    },
  })
}

export default mint