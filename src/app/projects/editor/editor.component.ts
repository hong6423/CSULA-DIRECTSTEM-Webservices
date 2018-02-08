import {Component,
        Input,
        OnInit} from '@angular/core';
import {ActivatedRoute,
        Params,
        Router} from '@angular/router';
import {ModalDismissReasons,
        NgbModal} from '@ng-bootstrap/ng-bootstrap';
import * as d3 from 'd3';
import * as _ from 'lodash';

import {Graph} from '../../shared/graph.model';
import {Project} from '../../shared/models/project.model';
import {ProjectService} from '../../shared/services/project.service';
import {Node} from '../../shared/models/node.model';
//import {NodeService} from '../../shared/services/node.service';
import {View} from '../../shared/view.model';
import {WebserviceConfigMenuComponent} from '../../webservice-config-menu/webservice-config-menu.component';

@Component({
  selector: 'app-editor',
  templateUrl: './editor.component.html',
  styleUrls: ['./editor.component.css']
})
export class EditorComponent implements OnInit {
  project: Project;
  node: Node;
  rightPanelStyle: Object = {};
  mainSvg;
  graph: Graph;
  closeResult: string;
  views: View[];
  radioOptions: string;

  // Mouse Position, used to insert new nodes onto the coordinate.
  rightClickPos: {x: number, y: number};

  constructor(private projectService: ProjectService, private route: ActivatedRoute, private modalService: NgbModal, private router: Router) {
  }

  ngOnInit() {
    this.views = [];
    this.initPage();
    this.radioOptions = 'editor';
  }

  /* *********************************************************************** */
  /**
     * Retrieve the node that correspond with the route param id value. If
     * it is valid load up the graph of the node, otherwise navigate back to
     * the project page.
     */
  initPage(): void {
    let id;  // Route Param.
    this.route.params
        .switchMap((params: Params) => {
          id = +params['id'];
          return this.projectService.getProject(id);
        })
        .subscribe((project: Project) => {
          if (!project) {  // Route back to the project page if id doesn't exist.
            console.error(`There are no projects with the id: ${id}!`);
            console.error('Returning to the project page');
            this.router.navigate(['../../']);
            return;
          }
          this.project = project;
          this.initGraph(project);
        });
  }

  /**
     * Initialize the graph view with the corresponding node (single).
     * Thus parentNode will be NULL and NO edge will be shown.
     */
  initGraph(project): void {
    this.mainSvg = d3.select('div#d3-editor').append('svg');
    this.graph = new Graph(this.mainSvg, project.nodes, project.edges);
    this.views.push(new View([project], project));
    this.graph.updateGraph();
  }

  /** Create a composite node of the clicked nodes */
  compositeClickNodes(): void {
    console.log('COMPOSITE CLICKED NODES');

    const OFFSET = -120;
    /*
    const node = this.nodeService.createNew({
      x: this.rightClickPos.x,
      y: this.rightClickPos.y + OFFSET
    });
    */
    // TODO: get this id directly from the db
    let node_id = Math.trunc(Math.random() * 999999999) + 1;
    const node = new Node(node_id,
                          this.rightClickPos.x, this.rightClickPos.y);

    // Add the clickedNodes as children of this node.
    this.graph.compositeClickNodes(node);

    const oldView = _.last(this.views);    // the view before composition
    const currentView = this.currentView;  // the view after composition;

    // Add the new node as a child of parentNode.
    /*
    if (oldView.parentNode) {
      oldView.parentNode.children = currentView.nodes;
      this.nodeService.updateNodeToService(oldView.parentNode);
    }
    */

    // Update the current view nodes and inform nodeService of the new node
    this.replaceRecentView(currentView);

    /*
    this.nodeService.add(node);
    this.updateNodesToService(currentView.nodes);
    */

    // update the project in current view
    this.addNodeToProject(currentView.currentProject, node);
    this.updateProjectToService(currentView.currentProject);
    this.updateProjectsToService(currentView.projects);

    this.closeContextMenu();
  }

  /** Return the graph's current view, this.graph.currentView */
  get currentView(): View {
    return this.graph.currentView;
  }

  closeContextMenu() {
    this.rightPanelStyle = {'display': 'none'};
  }

  debugNode(content): void {
    if (this.selectedNode) {
      this.modalService.open(content);
    }
    this.closeContextMenu();
  }

  /** Used to keep track of adding an edge */
  detectShiftLMouseUp($event): void {
    if ($event.shiftKey && $event.which === 1) {
      console.log('SHIFT LEFT-MOUSE UP');
      console.log("number of init edges: " + this.project.edges.length);

      const currentView = _.last(this.views);  // the view before edge;
      const updatedView = this.currentView;    // the view after edge;

      this.project.edges = this.graph.edges; // update edges

      console.log("number of edges: " + this.project.edges.length);

      currentView.projects = updatedView.projects;
      this.updateProjectsToService(currentView.projects);
    }
  }

  detectRightMouseClick($event) {
    if ($event.which === 3) {
      this.rightPanelStyle = {
        'display': 'block',
        'left': ($event.clientX + 1) + 'px',
        'top': ($event.clientY + 1) + 'px'
      };
      this.rightClickPos = {x: $event.clientX, y: $event.clientY};
      return false;
    }
  }

  drawCurrentView() {
    console.log('DRAW CURRENT VIEW');
    const recentView = _.last(this.views);

    /* Reset the svg and load up the previous state */
    this.mainSvg.selectAll('*').remove();
    this.graph = new Graph(
        this.mainSvg, recentView.currentProject.nodes, recentView.currentProject.edges);
    this.graph.updateGraph();
  }

  edit(): void {
    if (this.graph.state.selectedNode) {
      this.openConfigModal();
    }
    this.closeContextMenu();
  }

  getDismissReason(reason: any): string {
    if (reason === ModalDismissReasons.ESC) {
      return 'by pressing ESC';
    } else if (reason === ModalDismissReasons.BACKDROP_CLICK) {
      return 'by clicking on a backdrop';
    } else {
      return `with: ${reason}`;
    }
  }


  /** Insert a node onto the graph and updateToService nodeService.
     * Also add the node into its parent.children array. */
  insertNode(): void {
    console.log('adding a new node');
    const OFFSET = -120;
    /*
    const node = this.nodeService.createNew({
      x: this.rightClickPos.x,
      y: this.rightClickPos.y + OFFSET
    });
    */
    // TODO: get this id directly from the db
    let node_id = Math.trunc(Math.random() * 999999999) + 1;
    const node = new Node(node_id,
                          this.rightClickPos.x, this.rightClickPos.y);

    /* Update the view to include the new node. */
    const recentView = _.last(this.views);

    /*
    if (recentView.parentNode) {
      recentView.parentNode.children.push(node);
      this.nodeService.updateNodeToService(recentView.parentNode);
    }
    recentView.nodes.push(node);
    this.nodeService.add(node);
    */

    if(recentView.currentProject)
      recentView.currentProject.nodes.push(node);

    // update the project in current view
    this.addNodeToProject(recentView.currentProject, node);
    this.updateProjectToService(recentView.currentProject);
    this.updateProjectsToService(recentView.projects);

    this.graph.insertNode(node);

    this.closeContextMenu();
  }

  get lastView(): View {
    return _.last(this.views);
  }

  openQuickEditModal(content) {
    this.modalService.open(content).result.then((result) => {
      this.graph.updateGraph();
      this.closeResult = `Closed with: ${result}`;
    }, (reason) => {
      this.closeResult = `Dismissed ${this.getDismissReason(reason)}`;
    });
  }

  openConfigModal() {
    const modalRef = this.modalService
                         .open(WebserviceConfigMenuComponent, {size: 'lg'});
    const inputNodes = this.getInputsToNode(this.selectedNode);
    modalRef.componentInstance.project = this.project;
    modalRef.componentInstance.node = this.selectedNode;
    modalRef.componentInstance.inputNodes = inputNodes;
    modalRef.result
        .then(
            (result: any) => {
              this.syncNode(this.selectedNode);
              this.drawCurrentView();
            },
            (reason: any) => {
              this.syncNode(this.selectedNode);
              this.drawCurrentView();
            });
  }

  /* Return all the nodes that has an edge to the input node. ignores nodes
    * that doesn't have a "service" */
  getInputsToNode(node: Node): Node[] {
    return this.graph
        .edges
        .filter(edge => (edge.target.id === node.id) && edge.source.service)
        .map(edge => edge.source);
  }

  /* Ensure that the parent.children (nodes) and view.nodes are in sync.
     * they could be out of sync if the user update the title/description */
  syncNode(node: Node): void {
    //this.syncParentChild(node);
    this.syncViewNode(node);
  }

  syncParentChild(node: Node): void {
    const childToUpdate = this.graph.parentNode.children
                              .find((n: Node) => n.id === node.id);
    Object.assign(childToUpdate, node);
  }

  syncViewNode(node: Node): void {
    const viewNode = this.lastView
                         .currentProject
                         .nodes
                         .find((n: Node) => n.id === node.id);
    Object.assign(viewNode, node);
  }

  openNoCompositionModal(content) {
    this.modalService.open(content);
  }

  get nodeClone(): Node {
    return _.cloneDeep(this.node);
  }

  /*
  removeNodeFromService(node: Node): void {
    return this.nodeService.removeNode(node);
  }
  */

  removeNode(): void {
    console.log('REMOVING NODE');
    //this.removeNodeFromService(this.selectedNode);
    this.graph.removeSelectedNode();
    this.closeContextMenu();
  }

  removeEdge(): void {
    console.log('REMOVING EDGE');
    this.graph.removeSelectedEdge();
    const currentView = this.currentView;

    /*
    if (currentView.parentNode) {
      currentView.parentNode.children = currentView.nodes;
    }
    */

    this.replaceRecentView(currentView);
    this.updateViewToService(currentView);
    this.closeContextMenu();
  }

  removeSelected(): void {
    if (this.graph.state.selectedNode) {
      this.removeNode();
    } else if (this.graph.state.selectedEdge) {
      this.removeEdge();
    } else {
      this.closeContextMenu();
    }
  }

  replaceRecentView(newView: View): void {
    this.views.pop();
    this.views.push(newView);
  }

  /**
     * Navigate back to the parent node. Use to traverse back from
     * a composition view by one level. */
  returnToParent() {
    /* Don't undo if the user only have 1 view left
         * because it is the main graph view. */
    if (this.views.length <= 1) {
      this.closeContextMenu();
      return;
    }
    console.log('RETURNING TO PARENT NODE');
    /* Remove the current view and return to the previous view*/
    const poppedView = this.views.pop();
    const currentView = _.last(this.views);
    this.updateViewFromService(currentView);

    this.drawCurrentView();
    this.closeContextMenu();
  }

  get selectedNode(): Node {
    return this.graph.state.selectedNode;
  }

  addNodeToProject(project: Project, node: Node): void {
    if (!project.nodes.findIndex((n: Node) => n.id === node.id)) {
      project.nodes.push(node);
    }
  }

  /**
     * Update the nodes with the latest changes. This should be called
     * after navigating to composition view because the user could insert,
     * add children, to a node and thus it would need to be updated. */
  updateProjectsFromService(projects: Array<Project>): void {
    this.projectService.updateProjectsFromService(projects);
  }

  updateProjectFromService(project: Project): void {
    this.projectService.updateProjectFromService(project);
  }

  /**
     * Update the  nodes with the latest changes. This should be called
     * after navigating to composition view because the user could insert,
     * add children, to a node and thus it would needs to be updated. .*/
  /*
  updateNodesFromService(nodes: Array<Node>): void {
    this.nodeService.updateNodesFromService(nodes);
  }

  updateNodeFromService(node: Node): void {
    this.nodeService.updateNodeFromService(node);
  }
  */

  updateViewFromService(view: View): void {
    this.updateProjectsFromService(view.projects);
    this.updateProjectFromService(view.currentProject);
    //this.updateNodesFromService(view.nodes);
    //this.updateNodeFromService(view.parentNode);
  }

  updateViewToService(view: View): void {
    this.projectService.updateViewToService(view);
    //this.nodeService.updateViewToService(view);
  }

  updateProjectToService(project: Project): void {
    this.projectService.updateProjectToService(project);
  }

  updateProjectsToService(projects: Array<Project>): void {
    projects.forEach((p: Project) => {
      this.projectService.updateProjectToService(p);
    })
  }

  /*
  updateNodeToService(node: Node): void {
    this.nodeService.updateNodeToService(node);
  }

  updateNodesToService(nodes: Array<Node>): void {
    nodes.forEach((n: Node) => {
      this.nodeService.updateNodeToService(n);
    });
  }
  */

  viewComposition(content): void {
    if (this.selectedNode) {
      console.log('VIEWING COMPOSITION');

      /* Alert the users with a modal that this view has no composition nodes */
      if (this.selectedNode.children.length === 0) {
        this.openNoCompositionModal(content);
      }

      //this.updateNodeFromService(this.selectedNode);
      // TODO: make this display the sub project
      /*
      this.updateProjectFromService(this.project);

      this.mainSvg.selectAll('*').remove();
      this.graph = new Graph(
          this.mainSvg, this.selectedNode.children, this.selectedNode);
      this.graph.updateGraph();
      this.views.push(this.graph.currentView);
      */
    }
    this.closeContextMenu();
  }

  viewPerformance(modal): void {
    this.openQuickEditModal(modal);
    this.closeContextMenu();
  }
}
