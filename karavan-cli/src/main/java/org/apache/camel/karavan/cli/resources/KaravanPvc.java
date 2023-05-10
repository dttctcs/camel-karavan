/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
* See the License for the specific language governing permissions and
* limitations under the License.
 */
package org.apache.camel.karavan.cli.resources;

import io.fabric8.kubernetes.api.model.PersistentVolumeClaim;
import io.fabric8.kubernetes.api.model.PersistentVolumeClaimBuilder;
import io.fabric8.kubernetes.api.model.Quantity;
import io.fabric8.kubernetes.api.model.ResourceRequirementsBuilder;
import org.apache.camel.karavan.cli.Constants;
import org.apache.camel.karavan.cli.KaravanConfig;
import org.apache.camel.karavan.cli.ResourceUtils;

import java.util.Map;

public class KaravanPvc {

    public static PersistentVolumeClaim getPvcData (KaravanConfig config) {
        return new PersistentVolumeClaimBuilder()
                .withNewMetadata()
                .withName(Constants.PVC_DATA)
                .withNamespace(config.getNamespace())
                .withLabels(ResourceUtils.getLabels(Constants.PVC_DATA, config.getVersion(), Map.of()))
                .endMetadata()
                .withNewSpec()
                .withResources(new ResourceRequirementsBuilder().withRequests(Map.of("storage", new Quantity("10Gi"))).build())
                .withVolumeMode("Filesystem")
                .withAccessModes("ReadWriteOnce")
                .endSpec()
                .build();
    }

    public static PersistentVolumeClaim getPvcM2Cache(KaravanConfig config) {
        return new PersistentVolumeClaimBuilder()
                .withNewMetadata()
                .withName(Constants.PVC_M2_CACHE)
                .withNamespace(config.getNamespace())
                .withLabels(ResourceUtils.getLabels(Constants.PVC_M2_CACHE, config.getVersion(), Map.of()))
                .endMetadata()
                .withNewSpec()
                .withResources(new ResourceRequirementsBuilder().withRequests(Map.of("storage", new Quantity("10Gi"))).build())
                .withVolumeMode("Filesystem")
                .withAccessModes("ReadWriteOnce")
                .endSpec()
                .build();
    }

    public static PersistentVolumeClaim getPvcJbangCache(KaravanConfig config) {
        return new PersistentVolumeClaimBuilder()
                .withNewMetadata()
                .withName(Constants.PVC_JBANG_CACHE)
                .withNamespace(config.getNamespace())
                .withLabels(ResourceUtils.getLabels(Constants.PVC_JBANG_CACHE, config.getVersion(), Map.of()))
                .endMetadata()
                .withNewSpec()
                .withResources(new ResourceRequirementsBuilder().withRequests(Map.of("storage", new Quantity("2Gi"))).build())
                .withVolumeMode("Filesystem")
                .withAccessModes("ReadWriteOnce")
                .endSpec()
                .build();
    }
}
