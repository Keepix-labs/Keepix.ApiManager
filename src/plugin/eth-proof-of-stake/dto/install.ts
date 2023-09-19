import { IsDefined, Validate } from "class-validator";
import { MatchNumberValidator } from "src/shared/validators/match-number-validator";

export class InstallDto {
    @IsDefined()
    @Validate(MatchNumberValidator, [8, 16, 32])
    amount: number;
}