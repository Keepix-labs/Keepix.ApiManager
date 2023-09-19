import { Injectable } from "@nestjs/common";
import { BashService } from "src/shared/bash.service";

@Injectable()
export class EthProofOfStakeService {

    // public status = '';

    constructor(bashService: BashService) {
        
    }

}