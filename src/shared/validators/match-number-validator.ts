import { ValidationArguments, ValidatorConstraint, ValidatorConstraintInterface } from "class-validator";

@ValidatorConstraint({ name: 'number-of-ethers', async: false })
export class MatchNumberValidator implements ValidatorConstraintInterface {
  validate(value: any, args: ValidationArguments) {
    return typeof value === 'number' && args.constraints.includes(value);
  }

  defaultMessage(args: ValidationArguments) {
    return `(${args.value}) must be number in (${args.constraints.join('|')})`;
  }
}