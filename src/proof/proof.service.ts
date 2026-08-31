import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { CreateProofDto } from './dto/create-proof.dto';

@Injectable()
export class ProofService {
  async createProof(dto: CreateProofDto) {
    try {
      // In production, this would verify the verification_id exists and is complete
      return {
        data: {
          proof_id: `proof_${Math.random().toString(36).substr(2, 9)}`,
          status: 'active',
          verification_id: dto.verification_id,
          created_at: new Date().toISOString()
        }
      };
    } catch (error: any) {
      throw new InternalServerErrorException('Failed to create proof');
    }
  }

  async getProof(proofId: string) {
    // In production, fetch proof securely from DB
    return {
      data: {
        proof_id: proofId,
        status: 'active',
        created_at: new Date().toISOString(),
        // limited public metadata
      }
    };
  }
}
