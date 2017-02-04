//Unlinked makers
import {Species} from '../../lib/metis/species'
import {assign_random_sex, generate_basic_individual} from '../../lib/metis/individual'
import {generate_n_inds} from '../../lib/metis/population'
import * as genotype from '../../lib/metis/genotype'

import {SexualReproduction} from '../../lib/metis/operators/reproduction'

import {cycle} from '../../lib/metis/simulator'

const size = 20
let unlinked_genome = genotype.generate_unlinked_genome(size,
    () => {return new genotype.SNP()})
const species = new Species('unlinked', unlinked_genome)

let individuals = generate_n_inds(size, () =>
    assign_random_sex(generate_basic_individual(species)))
console.log(individuals)

let operators = [new SexualReproduction(species, size)]

let state = cycle(individuals, operators)

console.log(state.individuals)
