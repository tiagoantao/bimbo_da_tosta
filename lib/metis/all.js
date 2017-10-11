import {EventEmitter} from 'events'
import * as RxO from 'rxjs'

/** A Genomic marker.
 *
 * This is an abstract class.
 */
class gn_Marker {
    /**
     * Create a marker.
     * @param {list} possible_values - List of possible values (uint8)
     */
    constructor (possible_values) {
        if (this.constructor === Marker)
            throw new TypeError('Cannot construct Marker instances directly')
        this._possible_values = possible_values
    }


    /** Possible values for the marker */
    get possible_values() {
        return this._possible_values
    }

    set possible_values(possible_values) {
        this._possible_values = possible_values
    }

}


/**
 * A Single-Nucleotide Polymorphism (SNP).
 * @extends Marker
 */
class gn_SNP extends gn_Marker {
    /** Default for SNP is bi-allelic */
    constructor(possible_values=[0, 1]) {
        super(possible_values)
    }
}


/**
 * A Microsatelite.
 * @extends Marker
 */
class gn_MicroSatellite extends gn_Marker {
}



/**
 * A Complete chromosome.
 */
class gn_Chromosome {
    constructor (markers, distances=null) {  // distances in cMs
        if (distances != null && (markers.length != distances.length + 1)) {
            throw new RangeError('If distances are defined, its length has to be markers.length-1')
        }
        this._size = markers.length
        this._markers = markers
        this._distances = distances
    }

    get distances() {
        return this._distances
    }

    get markers() {
        return this._markers
    }
    
    get size() {
        return this._size
    }

    get is_autosomal() {
        return false
    }

    reproduce(individual, parent, ofs_position, parent_position) {
        for (let i=0; i<this._size; i++) {
            individual.genome[ofs_position + i] = parent.genome[parent_position + i]
        }
    }
}


/**
 * A Autosome. This version assumes full linkage and
 * transmits one gamete
 */
const gn_Autosome = Sup => class extends Sup {
    get size() {return 2*super.size}

    reproduce(individual, parents, position) {
        let [p1, p2] = [0, 1]
        if (Math.random() < 0.5) {
            [p1, p2] = [1, 0]
        }
        //This is wrong, always transmits the same gamete
        super.reproduce(individual, parents[p1], position, position)
        super.reproduce(individual, parents[p2], position + this.size / 2, position)
    }


    get markers() {
        let base_markers = super.markers
        return base_markers.concat(base_markers)
    }

    get is_autosomal() {
        return true
    }
}


/**
 * Chromosome pair.
 */
class gn_ChromosomePair extends gn_Autosome(gn_Chromosome) {
}


/**
 * A fully UnlinkedAutosome.
 * 
 * This could be done with a {@link LinkedAutosome} with
 * proper distances, but much more efficient
 * 
 * XXX: Do this as a mixin
 */
const gn_UnlinkedAutosome = Sup => class extends Sup {
    get size() {return 2*super.size}

    reproduce(individual, parents, position) {
        ///XXX: Change here 
    }

}


/**
 * A LinkedAutosome.
 * Genomic distances come from Sup.
 */
const gn_LinkedAutosome = Sup => class extends Sup {
    get size() {return 2*super.size}

    reproduce(individual, parents, position) {
        ///XXX: Change here 
    }
}


const gn_Mito = Sup => class extends Sup {}


const gn_YChromosome = Sup => class extends Sup {}


export const gn_XChromosome = Sup => class extends Sup {
    get size() {return 2*super.size} // Always double for now

    reproduce(individual, parents, position) {
        ///XXX: Change here 
    }
}


//Genome
class gn_Genome {
    constructor (metadata) {
        //metadata is a map of {string} to {@link Marker}
        this._metadata = metadata
        this._compute_marker_positions()
        let last_marker_name = this._marker_order[this._marker_order.length -1]
        let last_marker_size = this._metadata[last_marker_name].size
        this._size = this.get_marker_start(last_marker_name) + last_marker_size
    }

    _compute_marker_positions() {
        this._marker_order = []
        this._marker_start = new Map()
        let start = 0
        for (let name in this._metadata) {
            this._marker_order.push(name)
            this._marker_start.set(name, start)
            start += this._metadata[name].size
        }
    }

    get_marker_start(name) {
        return this._marker_start.get(name)
    }

    get size() {
        return this._size
    }

    get marker_order() {
        return this._marker_order
    }

    get metadata() {
        return this._metadata
    }
}


function gn_generate_unlinked_genome(num_markers, marker_generator) {
    let metadata = {}
    let markers = []
    for (let i=0; i<num_markers; i++) {
        markers.push(marker_generator())
    }
    metadata.unlinked = new ChromosomePair(markers)
    return new Genome(metadata)
}



class ops_BaseOperator {
    /**
     * Operates over global state
     * has: global_parameters, cycle, individuals, operators
     */
    change(state) {
        throw TypeError('This is an abstract method')
    }
}


class ops_CycleStopOperator extends ops_BaseOperator {
    constructor(cycle) {
        super()
        this._cycle = cycle
    }

    change(state) {
         if (state.cycle === this._cycle) {
             state.global_parameters.stop = true
        }
    }
 
}


class ops_RxOperator extends ops_BaseOperator {
    constructor() {
        super()
        this._emitter = new EventEmitter()
        this._observable =  RxO.Observable.fromEvent(this._emitter, 'event')
    }

    change(state) {
        this._emitter.emit('event', state.global_parameters)
    }

    get observable() {
        return this._observable
    }

    subscribe(fun) {
        this._observable.subscribe(fun)
    }
    
}


//Genome statistics should choose markers


class ops_StatisticsOperator extends ops_BaseOperator {
    constructor(name) {
        super()
        this._name = name
    }

    change(state) {
        state.global_parameters[this._name] = this.compute(
            state.global_parameters, state.cycle, state.individuals)
    }
}


class ops_GenomeCountStatistics extends ops_StatisticsOperator {
    compute(global_parameters, cycle, individuals) {
        let species = individuals[0].species
        let genome = species.genome
        let metadata = genome.metadata
        let position = 0
        let counts = {}
        for (let marker_name of genome.marker_order) {
            let marker_counts = []
            let marker = metadata[marker_name]
            let features = marker.markers
            let num_features, start
            if (marker.is_autosomal) {
                num_features = features.length / 2
                start = [0, num_features]
            }
            else {
                num_features = features.length
                start = [0]
            }
            for (let i=0; i < num_features; i++) {
                let feature_counts = {}
                for (let my_start of start) {
                    for (let individual of individuals) {
                        let allele = individual.genome[position + i]
                        if (allele in feature_counts) {
                            feature_counts[allele] += 1
                        }
                        else {
                            feature_counts[allele] = 1
                        }
                    }
                }
                marker_counts.push(feature_counts)
            }
            position += marker.size
            counts[marker_name] = marker_counts
        }
        return this.compute_counts(counts)
    }
}

let _i_id = 0

/** A individual */
class i_Individual {
    /**
     * Create an individual
     * @param {Species} species
     * @param {int} cycle_born When the individual was born
     *
     * The individual will be assigned a unique ID and will be alive.
     */
    constructor (species, cycle_born=0) {
        this._id = Individual.global_id
        this.species = species
        this._alive = true
        this.cycle_born = cycle_born
    }

    static get global_id() {
        return _i__id ++
    }

    get id() {
        return this._id
    }

    get alive() {
        return this._alive
    }
}


/** Assigns a random sex to an individual.
 *
 * This is done by a is_female attribute
 */
let i_assign_random_sex = (individual) => {
    individual.is_female = Math.random() >= .5
    return individual
}

/** Create an individual for a species in a cycle */
let i_generate_basic_individual = (species, cycle) => {
    let ind = new i_Individual(species, cycle)
    return ind
}


/** Create an individual for a species in a cycle */
let integrated_generate_individual_with_genome = (species, cycle=0,
    genome_generator) => {
    let ind = i_generate_basic_individual(species, cycle)
    genome_generator(ind)
    return ind
}


function integrated_create_simple_genome(individual, func) {
    let species = individual.species
    let genome = species.genome
    let metadata = genome.metadata
    let position = 0
    let genome_buffer = new ArrayBuffer(genome.size)
    let genome_data = new Uint8Array(genome_buffer)
    for (let marker_name of genome.marker_order) {
        let marker = metadata[marker_name]
        let features = marker.markers
        for (let i=0; i<features.length; i++) {
            let possible_values = features[i].possible_values
            genome_data[position + i] = func(possible_values)
        }
        position += marker.size
    }
    individual.genome = genome_data
}



function integrated_create_randomized_genome(individual) {
    create_simple_genome(individual, (possible_values) =>
        {return utils_random_choice(possible_values)})
}


function integrated_create_zero_genome(individual) {
    create_simple_genome(individual, (possible_values) =>
        {return 0})
}

let _integrated_test_val = 0
function integrated_create_test_genome(individual) {
    create_simple_genome(individual, (possible_values) =>
        {return _integrated_test_val++})
}
/** Population module
 *
 * This is a bit more general than "population" genetics. It can
 * generate many models of demography (e.g. landscape)
 *
 * @module population
 */

let p_generate_n_inds = (num_inds, generator) => {
    let inds = []
    for (let i=0; i<num_inds; i++) {
        inds.push(generator())
    }
    return inds
}




/**
 * Assign random population.
 * 
 * Assigns a random population number to all individuals.
 */
let p_assign_random_population = (inds, num_pops) => {
    for (let ind of inds) {
        ind.pop = Math.floor(Math.random() * num_pops)
    }
}

/**
 * Assign individuals to population in sequence.
 * 
 * Not random and allocates as fairly as possible accross populations.
 */
let p_assign_fixed_size_population = (inds, num_pops) => {
    for (let i=0; i<inds.length; i++) {
        inds[i].pop = i % num_pops
    }
}


/**
 * Migrates a fixed number of individuals from a population (Island).
 * 
 * Note that this is still stochastic for the receiving population.
 * Individuals cannot be returned back.
 * 
 */
let p_migrate_island_fixed = (inds, migs_per_pop) => {
    let num_pops = 0
    let pop_inds = {}
    for (let ind of inds) {
        let my_pop = ind.pop
        if (pop_inds[my_pop] === undefined) pop_inds[my_pop] = []
        pop_inds[my_pop].push(ind)
    }
    num_pops = Object.keys(pop_inds).length
    for (let export_pop=0; export_pop<num_pops; export_pop++) {
        for (let ind of pop_inds[export_pop]) {
            while (ind.pop == export_pop) {
                ind.pop = randint(0, num_pops)
            }
        }
    }

}


/**
 * Migrates a fixed number of individuals from a population (Island).
 * The algorithm is fair wrt receiving populations.
 * 
 * Individuals cannot be returned back.
 * 
 */
let p_migrate_island_fixed_fixed = (inds, migs_per_pop) => {
   
}

/** Executes the simulator for a single cycle.
 *
 * @param {individuals[]} individuals List of individuals
 * @param {BaseOperator[]} operators List of operators
 * @param {integer} operator
 */
let sim_cycle = (state) => {
    //An operation can change the ops that will execute in
    //the next cycle (but only in the next)
    //Operations should not do inconsistent changes between them...
    for (let operator of state.operators) {
        operator.change(state)
    }
    state.cycle += 1
}


/**
 * Do n cycles of simulation
 *
 * @param {integer} number of cycles
 * @param {individuals[]} individuals List of individuals
 * @param {BaseOperator[]} operators List of operators
 * @param {integer} operator
 */
let sim_do_n_cycles = (n, individuals, operators, previous_cycle=0,
    callback) => {
    let add_operators = operators.slice()
    add_operators.push(new ops_CycleStopOperator(n + previous_cycle))
        if (callback) {
        do_async_cycles(individuals, add_operators, previous_cycle, {}, callback)
    }
    else {
        return do_unspecified_cycles(individuals, add_operators, previous_cycle)
    }
}


/**
 * Do unspecified cycles of simulation.
 * 
 * One operator will add a stop=true to global_parameters
 *
 * @param {integer} number of cycles
 * @param {individuals[]} individuals List of individuals
 * @param {BaseOperator[]} operators List of operators
 * @param {integer} operator
 */
let sim_do_unspecified_cycles = (individuals, operators, previous_cycle=0) => {
    let state = {
        global_parameters: {stop: false}, individuals,
        operators, cycle: previous_cycle
    }
    while (state.global_parameters.stop === false) {
        cycle(state)
    }
    return state
}


/**
 * Do async (unspecified) cycles of simulation.
 *
 * One operator will add a stop=true to global_parameters
 *
 * @param {integer} number of cycles
 * @param {individuals[]} individuals List of individuals
 * @param {BaseOperator[]} operators List of operators
 * @param {integer} operator
 * @param callback
 */
let sim_do_async_cycles = (individuals, operators,
    previous_cycle=0, global_parameters={}, callback) => {
    let state = {
        global_parameters: {stop: false}, individuals,
        operators, cycle: previous_cycle
    }
    cycle(state)
    let return_callback
    if (!state.global_parameters.stop) {
        return_callback = do_async_cycles.bind(null, state.individuals,
            state.operators,
            previous_cycle + 1, state.global_parameters, callback) 
    }
    callback(state, return_callback)
}


/** A species */
class sp_Species {
    /**
     * A species.
     * @param {string} name
     * @param genome A {@link Genome}
     */
    constructor (name, genome) {
        this.name = name
        this._genome = genome
    }

    get genome() {
        return this._genome
    }
}

function utils_random_choice(choices) {
    let pos = Math.floor(Math.random() * choices.length)
    return choices[pos]
}