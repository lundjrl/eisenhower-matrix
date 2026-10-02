export namespace main {
	
	export class NewTask {
	    title: string;
	    quadrant: number;
	    x: number;
	    y: number;
	
	    static createFrom(source: any = {}) {
	        return new NewTask(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.title = source["title"];
	        this.quadrant = source["quadrant"];
	        this.x = source["x"];
	        this.y = source["y"];
	    }
	}
	export class Task {
	    id: string;
	    title: string;
	    quadrant: number;
	    x: number;
	    y: number;
	    createdAt: number;
	
	    static createFrom(source: any = {}) {
	        return new Task(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.title = source["title"];
	        this.quadrant = source["quadrant"];
	        this.x = source["x"];
	        this.y = source["y"];
	        this.createdAt = source["createdAt"];
	    }
	}

}

