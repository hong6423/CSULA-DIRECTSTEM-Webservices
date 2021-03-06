import {NgModule} from '@angular/core';
import {ReactiveFormsModule} from '@angular/forms';
import {NgbModule} from '@ng-bootstrap/ng-bootstrap';
import {BrowserModule} from '@angular/platform-browser';
import {HttpModule} from '@angular/http';
import {ProjectDemoComponent} from './project-demo.component';
import {GetAllProjectsComponent} from './forms/get-all-projects/get-all-projects.component';

@NgModule({
    declarations: [ProjectDemoComponent,
        GetAllProjectsComponent],
    imports: [NgbModule,
        BrowserModule,
        ReactiveFormsModule,
        HttpModule],
    exports: [ProjectDemoComponent],
    providers: [],
})
export class ProjectDemoModule {
}
